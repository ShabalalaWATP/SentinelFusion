import type { FireContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IFireContextService } from "../domain/interfaces";
import {
  bucketFireContextBounds,
  fireContextAreaLimitError,
  isCoordinateInsideBounds,
  maxFirmsCsvBytes,
  maxFirmsCsvRows
} from "./fire-context-limits";
import { normaliseFirmsCsv, type FirmsNormaliseResult } from "./firms-normaliser";
import {
  mockFireContext,
  notConfiguredFireContext,
  providerErrorFireContext,
  toFireContextResponse
} from "./firms-response";

const providerBaseUrl = "https://firms.modaps.eosdis.nasa.gov";

type Fetcher = typeof fetch;
type CacheEntry = {
  expiresAtMs: number;
  data: FirmsNormaliseResult;
};

export class FireContextService implements IFireContextService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<FirmsNormaliseResult>>();

  constructor(
    private readonly config: AppConfig,
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaFires(bounds: TrafficAreaBounds): Promise<FireContextResponse> {
    const now = this.now();
    const generatedAt = now.toISOString();
    const limitError = fireContextAreaLimitError(bounds);

    if (limitError) {
      return providerErrorFireContext(
        bounds,
        generatedAt,
        this.config.firmsSource,
        this.config.firmsDayRange,
        limitError
      );
    }

    if (this.config.firmsMode === "off") {
      return notConfiguredFireContext(
        bounds,
        generatedAt,
        this.config.firmsSource,
        this.config.firmsDayRange,
        {
          limitation: "Set FIRMS_MODE=live on the API server to enable FIRMS fire context.",
          reason: "NASA FIRMS fire context is disabled for this deployment."
        }
      );
    }

    if (this.config.firmsMode === "mock") {
      return mockFireContext(bounds, generatedAt, this.config.firmsSource, this.config.firmsDayRange);
    }

    if (!this.config.firmsMapKey) {
      return notConfiguredFireContext(
        bounds,
        generatedAt,
        this.config.firmsSource,
        this.config.firmsDayRange
      );
    }

    const providerBounds = bucketFireContextBounds(bounds);
    const cacheKey = cacheKeyFor(providerBounds, this.config);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > now.getTime()) {
      return this.buildResponse(bounds, generatedAt, cached.data, true);
    }

    try {
      const data = await this.fetchCachedProviderData(cacheKey, providerBounds, now);

      return this.buildResponse(bounds, generatedAt, data, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "NASA FIRMS request failed.";
      return providerErrorFireContext(
        bounds,
        generatedAt,
        this.config.firmsSource,
        this.config.firmsDayRange,
        message
      );
    }
  }

  private buildResponse(
    bounds: TrafficAreaBounds,
    generatedAt: string,
    data: FirmsNormaliseResult,
    cached: boolean
  ): FireContextResponse {
    return toFireContextResponse({
      area: bounds,
      cached,
      dayRange: this.config.firmsDayRange,
      detections: data.detections.filter((detection) => isCoordinateInsideBounds(detection, bounds)),
      generatedAt,
      maxDetections: this.config.firmsMaxDetections,
      providerRows: data.providerRows,
      sourceDataset: this.config.firmsSource,
      truncated: data.truncated
    });
  }

  private async fetchCachedProviderData(
    cacheKey: string,
    providerBounds: TrafficAreaBounds,
    now: Date
  ): Promise<FirmsNormaliseResult> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.fetchProviderData(providerBounds);
    this.inFlight.set(cacheKey, promise);

    try {
      const data = await promise;
      this.cacheResponse(cacheKey, data, now);

      return data;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async fetchProviderData(bounds: TrafficAreaBounds): Promise<FirmsNormaliseResult> {
    const csvText = await this.fetchAreaCsv(bounds);

    return normaliseFirmsCsv(csvText, this.config.firmsSource, maxFirmsCsvRows);
  }

  private async fetchAreaCsv(bounds: TrafficAreaBounds): Promise<string> {
    const responses = await Promise.all(
      splitBoundsForProvider(bounds).map(async (providerBounds) => {
        const response = await this.fetcher(buildFirmsUrl(providerBounds, this.config), {
          headers: { accept: "text/csv" },
          signal: AbortSignal.timeout(this.config.firmsTimeoutMs)
        });

        if (!response.ok) {
          throw new Error(`NASA FIRMS returned HTTP ${response.status}.`);
        }

        return readBoundedText(response);
      })
    );

    return mergeCsvResponses(responses);
  }

  private cacheResponse(cacheKey: string, data: FirmsNormaliseResult, now: Date): void {
    if (this.config.firmsCacheSeconds <= 0) {
      return;
    }

    if (this.cache.size >= this.config.firmsCacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      expiresAtMs: now.getTime() + this.config.firmsCacheSeconds * 1000,
      data
    });
  }
}

function buildFirmsUrl(bounds: TrafficAreaBounds, config: AppConfig): URL {
  const coordinates = [
    bounds.west.toFixed(4),
    bounds.south.toFixed(4),
    bounds.east.toFixed(4),
    bounds.north.toFixed(4)
  ].join(",");
  const path = [
    "api",
    "area",
    "csv",
    encodeURIComponent(config.firmsMapKey ?? ""),
    encodeURIComponent(config.firmsSource),
    coordinates,
    String(config.firmsDayRange)
  ].join("/");

  return new URL(`/${path}`, providerBaseUrl);
}

function splitBoundsForProvider(bounds: TrafficAreaBounds): TrafficAreaBounds[] {
  if (bounds.west <= bounds.east) {
    return [bounds];
  }

  return [
    { ...bounds, east: 180 },
    { ...bounds, west: -180 }
  ];
}

function mergeCsvResponses(responses: string[]): string {
  const [first, ...rest] = responses;
  if (!first) {
    return "";
  }

  const firstLines = first.trim().split(/\r?\n/);
  const extraLines = rest.flatMap((response) => response.trim().split(/\r?\n/).slice(1));

  const merged = [...firstLines, ...extraLines].filter(Boolean).join("\n");
  if (merged.length > maxFirmsCsvBytes) {
    throw new Error("NASA FIRMS response exceeded size limit.");
  }

  return merged;
}

function cacheKeyFor(bounds: TrafficAreaBounds, config: AppConfig): string {
  return [
    config.firmsSource,
    config.firmsDayRange,
    config.firmsMaxDetections,
    bounds.south.toFixed(4),
    bounds.west.toFixed(4),
    bounds.north.toFixed(4),
    bounds.east.toFixed(4)
  ].join(":");
}

async function readBoundedText(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxFirmsCsvBytes) {
    throw new Error("NASA FIRMS response exceeded size limit.");
  }

  const text = await response.text();
  if (text.length > maxFirmsCsvBytes) {
    throw new Error("NASA FIRMS response exceeded size limit.");
  }

  return text;
}

import type { ConflictContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IConflictContextService } from "../domain/interfaces";
import { normaliseAcledResponse, type AcledNormaliseResult } from "./acled-normaliser";
import {
  bucketConflictContextBounds,
  conflictContextAreaLimitError,
  isCoordinateInsideBounds,
  maxConflictJsonBytes,
  maxConflictProviderRows,
  splitAntimeridianBounds
} from "./conflict-context-limits";
import {
  mockConflictContext,
  notConfiguredConflictContext,
  providerErrorConflictContext,
  toConflictContextResponse
} from "./conflict-context-response";

const acledApiBaseUrl = "https://acleddata.com";
const acledFields = [
  "event_id_cnty",
  "event_date",
  "disorder_type",
  "event_type",
  "sub_event_type",
  "country",
  "admin1",
  "admin2",
  "location",
  "latitude",
  "longitude",
  "geo_precision",
  "source",
  "source_scale",
  "notes",
  "fatalities"
].join("|");

type Fetcher = typeof fetch;
type CacheEntry = {
  expiresAtMs: number;
  data: AcledNormaliseResult;
};
type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

export class ConflictContextService implements IConflictContextService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<AcledNormaliseResult>>();
  private tokenCache: TokenCache | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaConflict(bounds: TrafficAreaBounds): Promise<ConflictContextResponse> {
    const now = this.now();
    const generatedAt = now.toISOString();
    const mode = this.mode();
    const lookbackDays = this.lookbackDays();
    const maxResults = this.maxResults();
    const limitError = conflictContextAreaLimitError(bounds);

    if (limitError) {
      return providerErrorConflictContext(bounds, generatedAt, mode, lookbackDays, limitError);
    }

    if (mode === "off") {
      return notConfiguredConflictContext(bounds, generatedAt, mode, lookbackDays, {
        limitation: "Set CONFLICT_CONTEXT_MODE=live on the API server to enable conflict context.",
        reason: "Conflict and protest context is disabled for this deployment."
      });
    }

    if (mode === "mock") {
      return mockConflictContext(bounds, generatedAt, lookbackDays, maxResults);
    }

    let token: string | null;
    try {
      token = await this.getAccessTokenOrNull();
    } catch (error) {
      const message = error instanceof Error ? error.message : "ACLED authentication failed.";
      return providerErrorConflictContext(bounds, generatedAt, mode, lookbackDays, message);
    }

    if (!token) {
      return notConfiguredConflictContext(bounds, generatedAt, mode, lookbackDays);
    }

    const providerBounds = bucketConflictContextBounds(bounds);
    const cacheKey = cacheKeyFor(providerBounds, this.config);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > now.getTime()) {
      return this.buildResponse(bounds, generatedAt, cached.data, true);
    }

    try {
      const data = await this.fetchCachedProviderData(cacheKey, providerBounds, token, now);
      return this.buildResponse(bounds, generatedAt, data, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ACLED request failed.";
      return providerErrorConflictContext(bounds, generatedAt, mode, lookbackDays, message);
    }
  }

  private buildResponse(
    bounds: TrafficAreaBounds,
    generatedAt: string,
    data: AcledNormaliseResult,
    cached: boolean
  ): ConflictContextResponse {
    return toConflictContextResponse({
      area: bounds,
      cached,
      events: data.events.filter((event) => isCoordinateInsideBounds(event, bounds)),
      generatedAt,
      lookbackDays: this.lookbackDays(),
      maxResults: this.maxResults(),
      providerRows: data.providerRows,
      truncated: data.truncated
    });
  }

  private async fetchCachedProviderData(
    cacheKey: string,
    bounds: TrafficAreaBounds,
    token: string,
    now: Date
  ): Promise<AcledNormaliseResult> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.fetchProviderData(bounds, token);
    this.inFlight.set(cacheKey, promise);

    try {
      const data = await promise;
      this.cacheResponse(cacheKey, data, now);
      return data;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async fetchProviderData(
    bounds: TrafficAreaBounds,
    token: string
  ): Promise<AcledNormaliseResult> {
    const results = await Promise.all(
      splitAntimeridianBounds(bounds).map(async (providerBounds) =>
        this.fetchAcledArea(providerBounds, token)
      )
    );
    const eventById = new Map<string, ConflictContextResponse["events"][number]>();
    for (const result of results) {
      for (const event of result.events) {
        eventById.set(event.id, event);
      }
    }

    return {
      events: [...eventById.values()],
      providerRows: results.reduce((total, result) => total + result.providerRows, 0),
      truncated: results.some((result) => result.truncated)
    };
  }

  private async fetchAcledArea(
    bounds: TrafficAreaBounds,
    token: string
  ): Promise<AcledNormaliseResult> {
    const response = await this.fetcher(buildAcledUrl(bounds, this.config, this.now()), {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(this.timeoutMs())
    });

    if (!response.ok) {
      throw new Error(`ACLED returned HTTP ${response.status}.`);
    }

    const body = await readBoundedJson(response);
    if (providerStatus(body) >= 400) {
      throw new Error(`ACLED returned status ${providerStatus(body)}.`);
    }

    return normaliseAcledResponse(body, maxConflictProviderRows);
  }

  private async getAccessTokenOrNull(): Promise<string | null> {
    if (this.config.acledAccessToken) {
      return this.config.acledAccessToken;
    }

    if (!this.config.acledUsername || !this.config.acledPassword) {
      return null;
    }

    const nowMs = this.now().getTime();
    if (this.tokenCache && this.tokenCache.expiresAtMs > nowMs + 60_000) {
      return this.tokenCache.accessToken;
    }

    const username = this.config.acledUsername;
    const password = this.config.acledPassword;
    if (!username || !password) {
      return null;
    }

    const response = await this.fetcher(new URL("/oauth/token", acledApiBaseUrl), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        username,
        password,
        grant_type: "password",
        client_id: "acled",
        scope: "authenticated"
      }),
      signal: AbortSignal.timeout(this.timeoutMs())
    });

    if (!response.ok) {
      throw new Error(`ACLED OAuth returned HTTP ${response.status}.`);
    }

    const body = await readBoundedJson(response);
    const accessToken = typeof body.access_token === "string" ? body.access_token : "";
    const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3600;
    if (!accessToken) {
      throw new Error("ACLED OAuth response did not include an access token.");
    }

    this.tokenCache = {
      accessToken,
      expiresAtMs: nowMs + Math.max(60, expiresIn - 60) * 1000
    };
    return accessToken;
  }

  private cacheResponse(cacheKey: string, data: AcledNormaliseResult, now: Date): void {
    if (this.cacheSeconds() <= 0) {
      return;
    }

    if (this.cache.size >= this.cacheMaxEntries()) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      expiresAtMs: now.getTime() + this.cacheSeconds() * 1000,
      data
    });
  }

  private mode(): "off" | "mock" | "live" {
    return this.config.conflictContextMode ?? "live";
  }

  private lookbackDays(): number {
    return this.config.conflictContextLookbackDays ?? 14;
  }

  private timeoutMs(): number {
    return this.config.conflictContextTimeoutMs ?? 10000;
  }

  private cacheSeconds(): number {
    return this.config.conflictContextCacheSeconds ?? 900;
  }

  private cacheMaxEntries(): number {
    return this.config.conflictContextCacheMaxEntries ?? 200;
  }

  private maxResults(): number {
    return this.config.conflictContextMaxResults ?? 50;
  }
}

function buildAcledUrl(bounds: TrafficAreaBounds, config: AppConfig, now: Date): URL {
  const lookbackDays = config.conflictContextLookbackDays ?? 14;
  const maxResults = config.conflictContextMaxResults ?? 50;
  const endDate = toDateOnly(now);
  const startDate = toDateOnly(addDays(now, -lookbackDays));
  const url = new URL("/api/acled/read", acledApiBaseUrl);

  url.searchParams.set("_format", "json");
  url.searchParams.set("fields", acledFields);
  url.searchParams.set("event_date", `${startDate}|${endDate}`);
  url.searchParams.set("event_date_where", "BETWEEN");
  url.searchParams.set("latitude", `${bounds.south.toFixed(4)}|${bounds.north.toFixed(4)}`);
  url.searchParams.set("latitude_where", "BETWEEN");
  url.searchParams.set("longitude", `${bounds.west.toFixed(4)}|${bounds.east.toFixed(4)}`);
  url.searchParams.set("longitude_where", "BETWEEN");
  url.searchParams.set("limit", String(Math.min(maxConflictProviderRows, maxResults * 4)));

  return url;
}

function cacheKeyFor(bounds: TrafficAreaBounds, config: AppConfig): string {
  return [
    config.conflictContextProvider ?? "acled",
    config.conflictContextLookbackDays ?? 14,
    config.conflictContextMaxResults ?? 50,
    bounds.south.toFixed(4),
    bounds.west.toFixed(4),
    bounds.north.toFixed(4),
    bounds.east.toFixed(4)
  ].join(":");
}

async function readBoundedJson(response: Response): Promise<Record<string, unknown>> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxConflictJsonBytes) {
    throw new Error("ACLED response exceeded size limit.");
  }

  const text = await response.text();
  if (text.length > maxConflictJsonBytes) {
    throw new Error("ACLED response exceeded size limit.");
  }

  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("ACLED response was not a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function providerStatus(body: Record<string, unknown>): number {
  return typeof body.status === "number" ? body.status : 200;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

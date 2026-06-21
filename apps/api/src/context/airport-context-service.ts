import type { AirportContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IAirportContextService } from "../domain/interfaces";
import {
  airportContextAreaLimitError,
  bearingDegrees,
  centreOfBounds,
  defaultAirportSearchRadiusKm,
  distanceKm,
  type GeoPoint,
  isPointInsideBounds,
  maxAirportCsvRows,
  maxAirportSearchRadiusKm,
  maxAirportsCsvBytes,
  maxRunwayCsvRows,
  maxRunwaysCsvBytes
} from "./airport-context-limits";
import {
  mockAirportContext,
  notConfiguredAirportContext,
  providerErrorAirportContext,
  toAirportContextResponse
} from "./airport-context-response";
import {
  normaliseOurAirportsData,
  type AirportRecord,
  type OurAirportsDataset
} from "./ourairports-normaliser";

const airportsCsvUrl = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const runwaysCsvUrl = "https://davidmegginson.github.io/ourairports-data/runways.csv";

type Fetcher = typeof fetch;
type DatasetCache = {
  dataset: OurAirportsDataset;
  expiresAtMs: number;
};
type ResponseFocus = NonNullable<AirportContextResponse["focus"]>;

type AirportFocus = GeoPoint & {
  aircraftId?: string;
  label?: string;
  radiusKm?: number;
};

export class AirportContextService implements IAirportContextService {
  private datasetCache: DatasetCache | null = null;
  private datasetRequest: Promise<{ dataset: OurAirportsDataset; cached: boolean }> | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaAirports(bounds: TrafficAreaBounds): Promise<AirportContextResponse> {
    const generatedAt = this.now().toISOString();
    const limitError = airportContextAreaLimitError(bounds);
    if (limitError) {
      return providerErrorAirportContext(generatedAt, limitError, { area: bounds });
    }

    const focus = centreOfBounds(bounds);
    return this.buildContext({ area: bounds, focus: { ...focus, label: "Selected area centre" } });
  }

  async getNearbyAirports(focus: AirportFocus): Promise<AirportContextResponse> {
    const radiusKm = clampRadius(focus.radiusKm);
    return this.buildContext({
      focus: {
        latitude: focus.latitude,
        longitude: focus.longitude,
        ...(focus.aircraftId ? { aircraftId: focus.aircraftId } : {}),
        ...(focus.label ? { label: focus.label } : {})
      },
      radiusKm
    });
  }

  private async buildContext(args: {
    area?: TrafficAreaBounds;
    focus: ResponseFocus & GeoPoint;
    radiusKm?: number;
  }): Promise<AirportContextResponse> {
    const generatedAt = this.now().toISOString();

    if (this.config.airportContextMode === "off") {
      return notConfiguredAirportContext(generatedAt, {
        focus: args.focus,
        ...(args.area ? { area: args.area } : {}),
        reason: "Airport/runway context is disabled."
      });
    }

    if (this.config.airportContextMode === "mock") {
      return mockAirportContext(generatedAt, {
        focus: args.focus,
        ...(args.area ? { area: args.area } : {})
      });
    }

    try {
      const { cached, dataset } = await this.loadDataset();
      const selection = args.area
        ? selectAreaAirports(dataset, args.area, args.focus, this.config.airportContextMaxResults)
        : selectNearbyAirports(
            dataset,
            args.focus,
            args.radiusKm ?? defaultAirportSearchRadiusKm,
            this.config.airportContextMaxResults
          );

      return toAirportContextResponse({
        cached,
        focus: args.focus,
        generatedAt,
        airports: selection.airports,
        airportsTruncated: dataset.airportsTruncated,
        runwaysTruncated: dataset.runwaysTruncated,
        ...(args.area ? { area: args.area } : {}),
        ...(selection.fallbackReason ? { fallbackReason: selection.fallbackReason } : {})
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OurAirports request failed.";
      return providerErrorAirportContext(generatedAt, message, {
        focus: args.focus,
        ...(args.area ? { area: args.area } : {})
      });
    }
  }

  private async loadDataset(): Promise<{ dataset: OurAirportsDataset; cached: boolean }> {
    const nowMs = this.now().getTime();
    if (this.datasetCache && this.datasetCache.expiresAtMs > nowMs) {
      return { dataset: this.datasetCache.dataset, cached: true };
    }

    if (this.datasetRequest) {
      return this.datasetRequest;
    }

    this.datasetRequest = this.downloadDataset();
    try {
      return await this.datasetRequest;
    } finally {
      this.datasetRequest = null;
    }
  }

  private async downloadDataset(): Promise<{ dataset: OurAirportsDataset; cached: boolean }> {
    const [airportsCsv, runwaysCsv] = await Promise.all([
      this.fetchText(airportsCsvUrl, maxAirportsCsvBytes, "airports.csv"),
      this.fetchText(runwaysCsvUrl, maxRunwaysCsvBytes, "runways.csv")
    ]);
    const dataset = normaliseOurAirportsData({
      airportsCsv,
      runwaysCsv,
      maxAirportRows: maxAirportCsvRows,
      maxRunwayRows: maxRunwayCsvRows,
      maxRunwaysPerAirport: this.config.airportContextMaxRunwaysPerAirport
    });

    if (this.config.airportContextCacheSeconds > 0) {
      this.datasetCache = {
        dataset,
        expiresAtMs: this.now().getTime() + this.config.airportContextCacheSeconds * 1000
      };
    }

    return { dataset, cached: false };
  }

  private async fetchText(url: string, maxBytes: number, label: string): Promise<string> {
    const response = await this.fetcher(url, {
      headers: { accept: "text/csv" },
      signal: AbortSignal.timeout(this.config.airportContextTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`OurAirports ${label} returned HTTP ${response.status}.`);
    }

    const contentLength = response.headers.get("content-length");
    const declaredBytes = contentLength ? Number(contentLength) : undefined;
    if (declaredBytes !== undefined && Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error(`OurAirports ${label} exceeded size limit.`);
    }

    return readBoundedText(response, maxBytes, label);
  }
}

async function readBoundedText(response: Response, maxBytes: number, label: string): Promise<string> {
  if (!response.body) {
    return enforceTextLimit(await response.text(), maxBytes, label);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`OurAirports ${label} exceeded size limit.`);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

function enforceTextLimit(text: string, maxBytes: number, label: string): string {
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new Error(`OurAirports ${label} exceeded size limit.`);
  }

  return text;
}

function selectAreaAirports(
  dataset: OurAirportsDataset,
  area: TrafficAreaBounds,
  focus: GeoPoint,
  limit: number
): { airports: AirportContextResponse["airports"]; fallbackReason?: string } {
  const inside = dataset.airports.filter((airport) => isPointInsideBounds(airport, area));
  const source = inside.length > 0 ? inside : dataset.airports;
  const fallbackReason =
    inside.length > 0 ? undefined : "No airports were inside the selected area; nearest airports to the centre are shown.";

  return {
    airports: rankAirports(source, dataset, focus).slice(0, limit),
    ...(fallbackReason ? { fallbackReason } : {})
  };
}

function selectNearbyAirports(
  dataset: OurAirportsDataset,
  focus: GeoPoint,
  radiusKm: number,
  limit: number
): { airports: AirportContextResponse["airports"]; fallbackReason?: string } {
  const ranked = rankAirports(dataset.airports, dataset, focus);
  const withinRadius = ranked.filter((airport) => airport.distanceKm <= radiusKm);
  const source = withinRadius.length > 0 ? withinRadius : ranked;
  const fallbackReason =
    withinRadius.length > 0
      ? undefined
      : `No airports were within ${radiusKm.toLocaleString("en-GB")} km; nearest airports are shown.`;

  return {
    airports: source.slice(0, limit),
    ...(fallbackReason ? { fallbackReason } : {})
  };
}

function rankAirports(
  airports: AirportRecord[],
  dataset: OurAirportsDataset,
  focus: GeoPoint
): AirportContextResponse["airports"] {
  return airports
    .map((airport) => ({
      ...airport,
      distanceKm: Number(distanceKm(focus, airport).toFixed(1)),
      bearingDegrees: Math.round(bearingDegrees(focus, airport)),
      runways: dataset.runwaysByAirport.get(airport.ident) ?? []
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

function clampRadius(value: number | undefined): number {
  if (value === undefined) {
    return defaultAirportSearchRadiusKm;
  }

  return Math.min(Math.max(value, 1), maxAirportSearchRadiusKm);
}

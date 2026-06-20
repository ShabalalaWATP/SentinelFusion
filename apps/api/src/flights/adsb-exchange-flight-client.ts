import type { Aircraft } from "@aisstream/shared";
import { z } from "zod";
import type { AppConfig, AisBoundingBox } from "../config/environment";
import type { FlightStreamLifecycleEvent, IFlightTrackingClient } from "../domain/interfaces";
import {
  buildAircraftTrack,
  boundedLatitude,
  boundedLongitude,
  boundedNumber,
  classifyAndRisk,
  cleanOptionalString,
  isEmergencySquawk,
  normaliseHeading,
  timestampFromMilliseconds,
  type AircraftTrackState
} from "./flight-normalisation";

const defaultGatewayUrl = "https://gateway.adsbexchange.com";
const maxRadiusNm = 250;

const adsbResponseSchema = z.object({
  ac: z.array(z.record(z.unknown())).optional(),
  aircraft: z.array(z.record(z.unknown())).optional(),
  now: z.number().optional()
});

export class AdsbExchangeFlightTrackingClient implements IFlightTrackingClient {
  private readonly baseUrl: string;
  private readonly tracks: AircraftTrackState = new Map();

  constructor(private readonly config: AppConfig) {
    this.baseUrl = (config.flightApiBaseUrl ?? defaultGatewayUrl).replace(/\/$/, "");
  }

  subscribe(
    onAircraft: (aircraft: Aircraft[]) => void,
    onEvent?: (event: FlightStreamLifecycleEvent) => void
  ): () => void {
    let stopped = false;
    onEvent?.({ type: "state", state: "subscribed", connected: true });

    const poll = async (): Promise<void> => {
      if (stopped) {
        return;
      }

      try {
        const aircraft = await this.fetchAircraft();
        const sourceTimestamp = aircraft[0]?.lastUpdated ?? new Date().toISOString();
        onEvent?.({ type: "message", sourceTimestamp });
        onAircraft(aircraft);
      } catch (error) {
        onEvent?.({
          type: "error",
          message: error instanceof Error ? error.message : "ADS-B Exchange request failed"
        });
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), this.config.flightPollIntervalMs);

    return () => {
      stopped = true;
      clearInterval(timer);
      onEvent?.({ type: "state", state: "closed", connected: false });
    };
  }

  private async fetchAircraft(): Promise<Aircraft[]> {
    const batches = await Promise.all(
      this.config.flightBoundingBoxes.map((bounds) => this.fetchBoundingBox(bounds))
    );
    const aircraftById = new Map<string, Aircraft>();

    batches.flat().forEach((aircraft) => {
      aircraftById.set(aircraft.id, aircraft);
    });

    return [...aircraftById.values()];
  }

  private async fetchBoundingBox(bounds: AisBoundingBox): Promise<Aircraft[]> {
    const now = new Date();
    const response = await fetchWithTimeout(
      buildLocationUrl(this.baseUrl, bounds),
      this.config.flightProviderTimeoutMs,
      this.config.flightApiKey
    );
    if (!response.ok) {
      throw new Error(`ADS-B Exchange returned HTTP ${response.status}`);
    }

    const payload = adsbResponseSchema.parse(await response.json());
    const generatedAt = timestampFromMilliseconds(payload.now, now);
    const rawAircraft = payload.ac ?? payload.aircraft ?? [];

    return rawAircraft
      .map((item) => normaliseAdsbAircraft(item, generatedAt, this.tracks))
      .filter((aircraft): aircraft is Aircraft => aircraft !== null);
  }
}

function normaliseAdsbAircraft(
  item: Record<string, unknown>,
  generatedAt: string,
  tracks: AircraftTrackState
): Aircraft | null {
  const icao24 = cleanOptionalString(item.hex)?.toLowerCase();
  const longitude = boundedLongitude(item.lon);
  const latitude = boundedLatitude(item.lat);
  if (!icao24 || longitude === undefined || latitude === undefined) {
    return null;
  }

  const callsign = cleanOptionalString(item.flight);
  const registration = cleanOptionalString(item.r);
  const aircraftType = cleanOptionalString(item.t);
  const category = cleanOptionalString(item.category);
  const squawk = cleanOptionalString(item.squawk);
  const altitudeFt = altitudeFieldToFeet(item.alt_baro);
  const geoAltitudeFt = altitudeFieldToFeet(item.alt_geom);
  const groundSpeedKt = boundedNumber(item.gs, 0, 1200);
  const verticalRateFpm = boundedNumber(item.baro_rate, -20000, 20000);
  const emergencyState = cleanOptionalString(item.emergency);
  const emergency =
    isEmergencySquawk(squawk) ||
    Boolean(emergencyState && emergencyState.toLowerCase() !== "none") ||
    item.alert === true;
  const classification = classifyAndRisk({
    ...(aircraftType ? { aircraftType } : {}),
    ...(callsign ? { callsign } : {}),
    ...(category ? { category } : {}),
    emergency,
    ...(registration ? { registration } : {})
  });
  const aircraftBase: Omit<Aircraft, "track"> = {
    id: `icao24-${icao24}`,
    icao24,
    ...(callsign ? { callsign } : {}),
    ...(registration ? { registration } : {}),
    ...(aircraftType ? { aircraftType } : {}),
    longitude,
    latitude,
    ...(altitudeFt !== undefined ? { altitudeFt } : {}),
    ...(geoAltitudeFt !== undefined ? { geoAltitudeFt } : {}),
    ...(groundSpeedKt !== undefined ? { groundSpeedKt } : {}),
    ...(normaliseHeading(item.track) !== undefined ? { trackDegrees: normaliseHeading(item.track) } : {}),
    ...(verticalRateFpm !== undefined ? { verticalRateFpm } : {}),
    ...(squawk ? { squawk } : {}),
    emergency,
    onGround: item.alt_baro === "ground",
    ...(category ? { category } : {}),
    classification: classification.classification,
    riskLevel: classification.riskLevel,
    source: "adsbexchange",
    lastUpdated: generatedAt
  };

  return {
    ...aircraftBase,
    track: buildAircraftTrack(aircraftBase, tracks)
  };
}

function buildLocationUrl(baseUrl: string, bounds: AisBoundingBox): URL {
  const centerLatitude = (bounds[0][0] + bounds[1][0]) / 2;
  const centerLongitude = (bounds[0][1] + bounds[1][1]) / 2;
  const latitudeSpanNm = Math.abs(bounds[1][0] - bounds[0][0]) * 60;
  const longitudeSpanNm =
    Math.abs(bounds[1][1] - bounds[0][1]) * 60 * Math.cos((centerLatitude * Math.PI) / 180);
  const radiusNm = Math.min(maxRadiusNm, Math.max(1, Math.ceil(Math.max(latitudeSpanNm, longitudeSpanNm) / 2)));
  const root = baseUrl.includes("/api/aircraft/v2") ? baseUrl : `${baseUrl}/api/aircraft/v2`;

  return new URL(`${root}/lat/${centerLatitude.toFixed(4)}/lon/${centerLongitude.toFixed(4)}/dist/${radiusNm}`);
}

function altitudeFieldToFeet(value: unknown): number | undefined {
  if (value === "ground") {
    return 0;
  }

  return boundedNumber(value, -1500, 100000);
}

async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
  apiKey: string | undefined
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers["api-auth"] = apiKey;
  }

  try {
    return await fetch(url, {
      headers,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

import {
  aisStreamStatusSchema,
  aircraftIntelResponseSchema,
  aircraftSnapshotResponseSchema,
  analysisRequestSchema,
  analysisSummarySchema,
  airportContextResponseSchema,
  fireContextResponseSchema,
  flightStreamStatusSchema,
  healthResponseSchema,
  marineWeatherResponseSchema,
  vesselIntelResponseSchema,
  vesselSnapshotResponseSchema,
  type AisStreamStatus,
  type AircraftSnapshotResponse,
  type AircraftIntelResponse,
  type AnalysisRequest,
  type AnalysisSummary,
  type AirportContextResponse,
  type FireContextResponse,
  type FlightStreamStatus,
  type HealthResponse,
  type MarineWeatherResponse,
  type TrafficAreaBounds,
  type VesselIntelResponse,
  type VesselSnapshotResponse
} from "@aisstream/shared";
import { env } from "../config/env";

export type ApiClient = {
  analyse(request: AnalysisRequest): Promise<AnalysisSummary>;
  getAircraft(): Promise<AircraftSnapshotResponse>;
  getAircraftAirportContext(aircraftId: string): Promise<AirportContextResponse>;
  getAircraftIntel(aircraftId: string): Promise<AircraftIntelResponse>;
  getAirportContext(bounds: TrafficAreaBounds): Promise<AirportContextResponse>;
  getFireContext(bounds: TrafficAreaBounds): Promise<FireContextResponse>;
  getFlightStatus(): Promise<FlightStreamStatus>;
  getHealth(): Promise<HealthResponse>;
  getMarineWeather(bounds: TrafficAreaBounds): Promise<MarineWeatherResponse>;
  getStreamStatus(): Promise<AisStreamStatus>;
  getVesselIntel(vesselId: string): Promise<VesselIntelResponse>;
  getVessels(): Promise<VesselSnapshotResponse>;
};

export function createApiClient(baseUrl: string): ApiClient {
  async function getJson<T>(path: string, parse: (value: unknown) => T): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return parse(await response.json());
  }

  async function postJson<T>(
    path: string,
    body: unknown,
    parse: (value: unknown) => T
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return parse(await response.json());
  }

  return {
    analyse: (request) =>
      postJson("/analysis", analysisRequestSchema.parse(request), (value) =>
        analysisSummarySchema.parse(value)
      ),
    getAircraft: () =>
      getJson("/aircraft", (value) => aircraftSnapshotResponseSchema.parse(value)),
    getAircraftAirportContext: (aircraftId) =>
      getJson(`/aircraft/${encodeURIComponent(aircraftId)}/airport-context`, (value) =>
        airportContextResponseSchema.parse(value)
      ),
    getAircraftIntel: (aircraftId) =>
      postJson(`/aircraft/${encodeURIComponent(aircraftId)}/intel`, {}, (value) =>
        aircraftIntelResponseSchema.parse(value)
      ),
    getAirportContext: (bounds) => {
      const params = new URLSearchParams({
        south: String(bounds.south),
        west: String(bounds.west),
        north: String(bounds.north),
        east: String(bounds.east)
      });

      return getJson(`/context/airports?${params.toString()}`, (value) =>
        airportContextResponseSchema.parse(value)
      );
    },
    getFireContext: (bounds) => {
      const params = new URLSearchParams({
        south: String(bounds.south),
        west: String(bounds.west),
        north: String(bounds.north),
        east: String(bounds.east)
      });

      return getJson(`/context/fire-anomalies?${params.toString()}`, (value) =>
        fireContextResponseSchema.parse(value)
      );
    },
    getFlightStatus: () =>
      getJson("/flight/status", (value) => flightStreamStatusSchema.parse(value)),
    getHealth: () => getJson("/health", (value) => healthResponseSchema.parse(value)),
    getMarineWeather: (bounds) => {
      const params = new URLSearchParams({
        south: String(bounds.south),
        west: String(bounds.west),
        north: String(bounds.north),
        east: String(bounds.east)
      });

      return getJson(`/context/marine-weather?${params.toString()}`, (value) =>
        marineWeatherResponseSchema.parse(value)
      );
    },
    getStreamStatus: () =>
      getJson("/stream/status", (value) => aisStreamStatusSchema.parse(value)),
    getVesselIntel: (vesselId) =>
      postJson(`/vessels/${encodeURIComponent(vesselId)}/intel`, {}, (value) =>
        vesselIntelResponseSchema.parse(value)
      ),
    getVessels: () =>
      getJson("/vessels", (value) => vesselSnapshotResponseSchema.parse(value))
  };
}

export const apiClient = createApiClient(env.apiBaseUrl);

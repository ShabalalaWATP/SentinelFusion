import {
  aisStreamStatusSchema,
  aircraftIntelResponseSchema,
  aircraftSnapshotResponseSchema,
  analysisRequestSchema,
  analysisSummarySchema,
  flightStreamStatusSchema,
  healthResponseSchema,
  vesselIntelResponseSchema,
  vesselSnapshotResponseSchema,
  type AisStreamStatus,
  type AircraftSnapshotResponse,
  type AircraftIntelResponse,
  type AnalysisRequest,
  type AnalysisSummary,
  type FlightStreamStatus,
  type HealthResponse,
  type VesselIntelResponse,
  type VesselSnapshotResponse
} from "@aisstream/shared";
import { env } from "../config/env";

export type ApiClient = {
  analyse(request: AnalysisRequest): Promise<AnalysisSummary>;
  getAircraft(): Promise<AircraftSnapshotResponse>;
  getAircraftIntel(aircraftId: string): Promise<AircraftIntelResponse>;
  getFlightStatus(): Promise<FlightStreamStatus>;
  getHealth(): Promise<HealthResponse>;
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
    getAircraftIntel: (aircraftId) =>
      postJson(`/aircraft/${encodeURIComponent(aircraftId)}/intel`, {}, (value) =>
        aircraftIntelResponseSchema.parse(value)
      ),
    getFlightStatus: () =>
      getJson("/flight/status", (value) => flightStreamStatusSchema.parse(value)),
    getHealth: () => getJson("/health", (value) => healthResponseSchema.parse(value)),
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

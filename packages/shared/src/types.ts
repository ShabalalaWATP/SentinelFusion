import type { z } from "zod";
import type {
  aircraftBatchEnvelopeSchema,
  aircraftClassificationSchema,
  aircraftIntelImageSchema,
  aircraftIntelProfileSchema,
  aircraftIntelResponseSchema,
  aircraftIntelSourceSchema,
  aircraftMetricsSchema,
  aircraftSchema,
  aircraftSnapshotResponseSchema,
  aircraftStreamEnvelopeSchema,
  aircraftTrackPointSchema,
  aircraftUpdateEnvelopeSchema,
  flightProviderSchema,
  flightStreamStatusSchema
} from "./aircraft-schemas";
import type {
  airportContextResponseSchema,
  fireContextResponseSchema,
  marineWeatherResponseSchema
} from "./context-schemas";
import type {
  aisRawMessageSchema,
  analysisAreaResultSchema,
  analysisAircraftIntelContextSchema,
  analysisSummarySchema,
  analysisVesselIntelContextSchema,
  aisStreamStateSchema,
  aisStreamStatusSchema,
  analysisRequestSchema,
  healthResponseSchema,
  mapProjectionSchema,
  mapStyleIdSchema,
  riskLevelSchema,
  vesselIntelImageSchema,
  vesselIntelProfileSchema,
  vesselIntelResponseSchema,
  vesselIntelSourceSchema,
  vesselMetricsSchema,
  vesselBatchEnvelopeSchema,
  vesselSchema,
  vesselSnapshotResponseSchema,
  vesselStreamEnvelopeSchema,
  vesselUpdateEnvelopeSchema
} from "./schemas";

export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type MapStyleId = z.infer<typeof mapStyleIdSchema>;
export type MapProjection = z.infer<typeof mapProjectionSchema>;
export type Vessel = z.infer<typeof vesselSchema>;
export type AisRawMessage = z.infer<typeof aisRawMessageSchema>;
export type AircraftClassification = z.infer<typeof aircraftClassificationSchema>;
export type FlightProvider = z.infer<typeof flightProviderSchema>;
export type Aircraft = z.infer<typeof aircraftSchema>;
export type AircraftTrackPoint = z.infer<typeof aircraftTrackPointSchema>;
export type AircraftMetrics = z.infer<typeof aircraftMetricsSchema>;
export type FlightStreamStatus = z.infer<typeof flightStreamStatusSchema>;
export type AircraftSnapshotResponse = z.infer<typeof aircraftSnapshotResponseSchema>;
export type AircraftStreamEnvelope = z.infer<typeof aircraftStreamEnvelopeSchema>;
export type AircraftUpdateEnvelope = z.infer<typeof aircraftUpdateEnvelopeSchema>;
export type AircraftBatchEnvelope = z.infer<typeof aircraftBatchEnvelopeSchema>;
export type AircraftIntelSource = z.infer<typeof aircraftIntelSourceSchema>;
export type AircraftIntelImage = z.infer<typeof aircraftIntelImageSchema>;
export type AircraftIntelProfile = z.infer<typeof aircraftIntelProfileSchema>;
export type AircraftIntelResponse = z.infer<typeof aircraftIntelResponseSchema>;
export type AisStreamState = z.infer<typeof aisStreamStateSchema>;
export type AisStreamStatus = z.infer<typeof aisStreamStatusSchema>;
export type VesselMetrics = z.infer<typeof vesselMetricsSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type VesselSnapshotResponse = z.infer<typeof vesselSnapshotResponseSchema>;
export type VesselStreamEnvelope = z.infer<typeof vesselStreamEnvelopeSchema>;
export type VesselUpdateEnvelope = z.infer<typeof vesselUpdateEnvelopeSchema>;
export type VesselBatchEnvelope = z.infer<typeof vesselBatchEnvelopeSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AnalysisAreaResult = z.infer<typeof analysisAreaResultSchema>;
export type AnalysisSummary = z.infer<typeof analysisSummarySchema>;
export type AnalysisAircraftIntelContext = z.infer<typeof analysisAircraftIntelContextSchema>;
export type AnalysisVesselIntelContext = z.infer<typeof analysisVesselIntelContextSchema>;
export type VesselIntelSource = z.infer<typeof vesselIntelSourceSchema>;
export type VesselIntelImage = z.infer<typeof vesselIntelImageSchema>;
export type VesselIntelProfile = z.infer<typeof vesselIntelProfileSchema>;
export type VesselIntelResponse = z.infer<typeof vesselIntelResponseSchema>;
export type AirportContextResponse = z.infer<typeof airportContextResponseSchema>;
export type MarineWeatherResponse = z.infer<typeof marineWeatherResponseSchema>;
export type FireContextResponse = z.infer<typeof fireContextResponseSchema>;

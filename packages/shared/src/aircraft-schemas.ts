import { z } from "zod";
import {
  aisBoundingBoxSchema,
  aisStreamStateSchema,
  riskLevelSchema,
  vesselCoordinateSchema
} from "./schemas";

const publicHttpUrlSchema = z.string().url().refine(
  (value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "URL must use http or https." }
);

export const aircraftClassificationSchema = z.enum([
  "military",
  "government",
  "commercial",
  "private",
  "unknown"
]);

export const flightProviderSchema = z.enum([
  "mock",
  "opensky",
  "adsbexchange",
  "fr24",
  "flightaware"
]);

export const aircraftTrackPointSchema = vesselCoordinateSchema.extend({
  altitudeFt: z.number().min(-1500).max(100000).optional(),
  timestamp: z.string().datetime()
});

export const aircraftSchema = z.object({
  id: z.string().min(1).max(80),
  icao24: z.string().regex(/^~?[0-9a-fA-F]{6}$/),
  callsign: z.string().min(1).max(16).optional(),
  registration: z.string().min(1).max(24).optional(),
  aircraftType: z.string().min(1).max(80).optional(),
  operator: z.string().min(1).max(160).optional(),
  originCountry: z.string().min(1).max(80).optional(),
  originAirport: z.string().min(3).max(8).optional(),
  destinationAirport: z.string().min(3).max(8).optional(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  altitudeFt: z.number().min(-1500).max(100000).optional(),
  geoAltitudeFt: z.number().min(-1500).max(100000).optional(),
  groundSpeedKt: z.number().min(0).max(1200).optional(),
  trackDegrees: z.number().min(0).max(360).optional(),
  verticalRateFpm: z.number().min(-20000).max(20000).optional(),
  squawk: z.string().regex(/^\d{4}$/).optional(),
  emergency: z.boolean(),
  onGround: z.boolean(),
  category: z.string().min(1).max(80).optional(),
  classification: aircraftClassificationSchema,
  riskLevel: riskLevelSchema,
  source: flightProviderSchema,
  lastUpdated: z.string().datetime(),
  track: z.array(aircraftTrackPointSchema).max(120)
});

export const aircraftMetricsSchema = z.object({
  liveAircraft: z.number().int().nonnegative(),
  trackedAircraft: z.number().int().nonnegative(),
  militaryAircraft: z.number().int().nonnegative(),
  emergencyAircraft: z.number().int().nonnegative(),
  averageAltitudeFt: z.number().nonnegative(),
  averageGroundSpeedKt: z.number().nonnegative(),
  dataLatencyMs: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime()
});

export const flightStreamStatusSchema = z.object({
  mode: z.enum(["mock", "replay", "live"]),
  provider: flightProviderSchema,
  state: aisStreamStateSchema,
  connected: z.boolean(),
  aircraftReceived: z.number().int().nonnegative(),
  aircraftNormalised: z.number().int().nonnegative(),
  aircraftDropped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  reconnectAttempts: z.number().int().nonnegative(),
  lastMessageAt: z.string().datetime().optional(),
  lastError: z.string().max(240).optional(),
  dataLatencyMs: z.number().int().nonnegative().optional(),
  subscription: z.object({
    endpoint: z.string().url().optional(),
    boundingBoxes: z.array(aisBoundingBoxSchema)
  })
});

export const aircraftSnapshotResponseSchema = z.object({
  aircraft: z.array(aircraftSchema),
  metrics: aircraftMetricsSchema,
  stream: flightStreamStatusSchema.optional()
});

export const aircraftSnapshotEnvelopeSchema = z.object({
  kind: z.literal("snapshot"),
  aircraft: z.array(aircraftSchema),
  metrics: aircraftMetricsSchema,
  sentAt: z.string().datetime()
});

export const aircraftUpdateEnvelopeSchema = z.object({
  kind: z.literal("update"),
  aircraft: aircraftSchema,
  metrics: aircraftMetricsSchema,
  sentAt: z.string().datetime()
});

export const aircraftBatchEnvelopeSchema = z.object({
  kind: z.literal("batch"),
  aircraft: z.array(aircraftSchema),
  metrics: aircraftMetricsSchema,
  sentAt: z.string().datetime()
});

export const aircraftMetricsEnvelopeSchema = z.object({
  kind: z.literal("metrics"),
  metrics: aircraftMetricsSchema,
  sentAt: z.string().datetime()
});

export const aircraftStreamEnvelopeSchema = z.discriminatedUnion("kind", [
  aircraftSnapshotEnvelopeSchema,
  aircraftUpdateEnvelopeSchema,
  aircraftBatchEnvelopeSchema,
  aircraftMetricsEnvelopeSchema
]);

export const aircraftIntelSourceSchema = z.object({
  title: z.string().min(1).max(160),
  url: publicHttpUrlSchema
});

export const aircraftIntelImageSchema = z.object({
  imageUrl: publicHttpUrlSchema,
  thumbnailUrl: publicHttpUrlSchema.optional(),
  sourceUrl: publicHttpUrlSchema.optional(),
  caption: z.string().min(1).max(240).optional()
});

export const aircraftIntelProfileSchema = z.object({
  matchedCallsign: z.string().min(1).max(40).optional(),
  icao24: z.string().regex(/^~?[0-9a-fA-F]{6}$/).optional(),
  registration: z.string().min(1).max(24).optional(),
  aircraftType: z.string().min(1).max(120).optional(),
  classification: aircraftClassificationSchema.optional(),
  operator: z.string().min(1).max(160).optional(),
  owner: z.string().min(1).max(160).optional(),
  manufacturer: z.string().min(1).max(120).optional(),
  model: z.string().min(1).max(120).optional(),
  serialNumber: z.string().min(1).max(80).optional(),
  buildYear: z.string().min(2).max(20).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional()
});

export const aircraftIntelResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["mock", "live"]),
  model: z.string().min(1).optional(),
  aircraftId: z.string().min(1),
  profile: aircraftIntelProfileSchema.optional(),
  summary: z.string().min(1).max(1200),
  facts: z.array(z.string().min(1).max(240)).min(1).max(8),
  sources: z.array(aircraftIntelSourceSchema).max(8),
  image: aircraftIntelImageSchema.optional(),
  images: z.array(aircraftIntelImageSchema).max(4).optional(),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  generatedAt: z.string().datetime(),
  requestId: z.string().min(1).optional()
});

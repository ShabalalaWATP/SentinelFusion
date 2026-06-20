import { z } from "zod";

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

export const riskLevelSchema = z.enum(["low", "medium", "high"]);

export const mapProjectionSchema = z.enum(["mercator", "globe"]);

export const mapStyleIdSchema = z.enum([
  "dark",
  "light",
  "streets",
  "satellite",
  "satellite-hybrid",
  "terrain",
  "outdoor"
]);

export const vesselCoordinateSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90)
});

export const vesselTrackPointSchema = vesselCoordinateSchema.extend({
  timestamp: z.string().datetime()
});

export const vesselSchema = z.object({
  id: z.string().min(1),
  mmsi: z.string().regex(/^\d{9}$/),
  name: z.string().min(1).max(120),
  callSign: z.string().max(32).optional(),
  shipType: z.string().min(1).max(80),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  speedOverGround: z.number().min(0).max(80),
  courseOverGround: z.number().min(0).max(360),
  heading: z.number().min(0).max(360).optional(),
  destination: z.string().max(160).optional(),
  navigationalStatus: z.string().min(1).max(80),
  riskLevel: riskLevelSchema,
  lastUpdated: z.string().datetime(),
  track: z.array(vesselTrackPointSchema).max(120)
});

export const aisRawMessageSchema = z.object({
  mmsi: z.string().regex(/^\d{9}$/),
  name: z.string().min(1).max(120).optional(),
  callSign: z.string().max(32).optional(),
  shipType: z.string().min(1).max(80).optional(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  speedOverGround: z.number().min(0).max(80),
  courseOverGround: z.number().min(0).max(360),
  heading: z.number().min(0).max(360).optional(),
  destination: z.string().max(160).optional(),
  navigationalStatus: z.string().min(1).max(80).optional(),
  timestamp: z.string().datetime()
});

export const vesselMetricsSchema = z.object({
  liveVessels: z.number().int().nonnegative(),
  trackedVessels: z.number().int().nonnegative(),
  highRiskVessels: z.number().int().nonnegative(),
  averageSpeed: z.number().nonnegative(),
  dataLatencyMs: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime()
});

export const aisStreamStateSchema = z.enum([
  "idle",
  "connecting",
  "subscribed",
  "reconnecting",
  "closed",
  "error"
]);

export const aisBoundingBoxSchema = z.tuple([
  z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
]);

export const aisStreamStatusSchema = z.object({
  mode: z.enum(["mock", "replay", "live"]),
  state: aisStreamStateSchema,
  connected: z.boolean(),
  messagesReceived: z.number().int().nonnegative(),
  messagesNormalised: z.number().int().nonnegative(),
  messagesDropped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  reconnectAttempts: z.number().int().nonnegative(),
  lastMessageAt: z.string().datetime().optional(),
  lastError: z.string().max(240).optional(),
  dataLatencyMs: z.number().int().nonnegative().optional(),
  subscription: z.object({
    endpoint: z.string().url().optional(),
    boundingBoxes: z.array(aisBoundingBoxSchema),
    filtersShipMMSI: z.array(z.string().regex(/^\d{9}$/)),
    filterMessageTypes: z.array(z.string().min(1))
  })
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  mode: z.enum(["mock", "replay", "live"]),
  timestamp: z.string().datetime()
});

export const vesselSnapshotResponseSchema = z.object({
  vessels: z.array(vesselSchema),
  metrics: vesselMetricsSchema,
  stream: aisStreamStatusSchema.optional()
});

export const vesselSnapshotEnvelopeSchema = z.object({
  kind: z.literal("snapshot"),
  vessels: z.array(vesselSchema),
  metrics: vesselMetricsSchema,
  sentAt: z.string().datetime()
});

export const vesselUpdateEnvelopeSchema = z.object({
  kind: z.literal("update"),
  vessel: vesselSchema,
  metrics: vesselMetricsSchema,
  sentAt: z.string().datetime()
});

export const vesselBatchEnvelopeSchema = z.object({
  kind: z.literal("batch"),
  vessels: z.array(vesselSchema),
  metrics: vesselMetricsSchema,
  sentAt: z.string().datetime()
});

export const vesselMetricsEnvelopeSchema = z.object({
  kind: z.literal("metrics"),
  metrics: vesselMetricsSchema,
  sentAt: z.string().datetime()
});

export const vesselStreamEnvelopeSchema = z.discriminatedUnion("kind", [
  vesselSnapshotEnvelopeSchema,
  vesselUpdateEnvelopeSchema,
  vesselBatchEnvelopeSchema,
  vesselMetricsEnvelopeSchema
]);

export const vesselIntelSourceSchema = z.object({
  title: z.string().min(1).max(160),
  url: publicHttpUrlSchema
});

export const vesselIntelImageSchema = z.object({
  imageUrl: publicHttpUrlSchema,
  thumbnailUrl: publicHttpUrlSchema.optional(),
  sourceUrl: publicHttpUrlSchema.optional(),
  caption: z.string().min(1).max(240).optional()
});

export const vesselIntelProfileSchema = z.object({
  matchedName: z.string().min(1).max(160).optional(),
  imo: z.string().min(3).max(20).optional(),
  mmsi: z.string().min(3).max(20).optional(),
  callSign: z.string().min(1).max(32).optional(),
  flag: z.string().min(1).max(80).optional(),
  vesselType: z.string().min(1).max(120).optional(),
  militaryClass: z.string().min(1).max(160).optional(),
  classification: z
    .enum(["military", "government", "commercial", "private", "unknown"])
    .optional(),
  operator: z.string().min(1).max(160).optional(),
  owner: z.string().min(1).max(160).optional(),
  buildYear: z.string().min(2).max(20).optional(),
  dimensions: z.string().min(1).max(120).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional()
});

export const vesselIntelResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["mock", "live"]),
  model: z.string().min(1).optional(),
  vesselId: z.string().min(1),
  profile: vesselIntelProfileSchema.optional(),
  summary: z.string().min(1).max(1200),
  facts: z.array(z.string().min(1).max(240)).min(1).max(8),
  sources: z.array(vesselIntelSourceSchema).max(8),
  image: vesselIntelImageSchema.optional(),
  images: z.array(vesselIntelImageSchema).max(4).optional(),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  generatedAt: z.string().datetime(),
  requestId: z.string().min(1).optional()
});

export const analysisVesselIntelContextSchema = z.object({
  vesselId: z.string().min(1).max(80),
  status: z.enum(["ok", "not_configured", "error"]),
  profile: vesselIntelProfileSchema.optional(),
  summary: z.string().min(1).max(1200),
  facts: z.array(z.string().min(1).max(240)).min(1).max(8),
  sources: z.array(vesselIntelSourceSchema).max(8),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  generatedAt: z.string().datetime().optional()
});

export const analysisAircraftIntelContextSchema = z.object({
  aircraftId: z.string().min(1).max(80),
  status: z.enum(["ok", "not_configured", "error"]),
  profile: z
    .object({
      matchedCallsign: z.string().min(1).max(40).optional(),
      icao24: z.string().regex(/^~?[0-9a-fA-F]{6}$/).optional(),
      registration: z.string().min(1).max(24).optional(),
      aircraftType: z.string().min(1).max(120).optional(),
      classification: z
        .enum(["military", "government", "commercial", "private", "unknown"])
        .optional(),
      operator: z.string().min(1).max(160).optional(),
      confidence: z.enum(["high", "medium", "low"]).optional()
    })
    .optional(),
  summary: z.string().min(1).max(1200),
  facts: z.array(z.string().min(1).max(240)).min(1).max(8),
  sources: z.array(vesselIntelSourceSchema).max(8),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  generatedAt: z.string().datetime().optional()
});

export const analysisAreaBoundsSchema = z
  .object({
    south: z.number().min(-90).max(90),
    west: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180)
  })
  .refine((bounds) => bounds.north > bounds.south, {
    message: "Area north bound must be greater than south bound."
  })
  .refine((bounds) => bounds.east !== bounds.west, {
    message: "Area east and west bounds must differ."
  });

export const analysisRequestSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  domain: z.enum(["all", "vessels", "aircraft"]).default("all"),
  vesselId: z.string().min(1).max(80).optional(),
  areaBounds: analysisAreaBoundsSchema.optional(),
  vesselIntel: z.array(analysisVesselIntelContextSchema).max(12).optional(),
  aircraftIntel: z.array(analysisAircraftIntelContextSchema).max(12).optional()
});

export const analysisAreaResultSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  bounds: analysisAreaBoundsSchema,
  count: z.number().int().nonnegative(),
  listedCount: z.number().int().nonnegative(),
  highRiskCount: z.number().int().nonnegative(),
  militaryCount: z.number().int().nonnegative(),
  averageSpeedKn: z.number().nonnegative(),
  aircraftCount: z.number().int().nonnegative().default(0),
  listedAircraftCount: z.number().int().nonnegative().default(0),
  militaryAircraftCount: z.number().int().nonnegative().default(0),
  emergencyAircraftCount: z.number().int().nonnegative().default(0),
  averageAircraftAltitudeFt: z.number().nonnegative().default(0),
  averageAircraftSpeedKt: z.number().nonnegative().default(0),
  vessels: z.array(
    z.object({
      id: z.string().min(1),
      mmsi: z.string().regex(/^\d{9}$/),
      name: z.string().min(1).max(120),
      shipType: z.string().min(1).max(80),
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      speedOverGround: z.number().min(0).max(80),
      courseOverGround: z.number().min(0).max(360),
      riskLevel: riskLevelSchema,
      classification: z.enum(["military", "government", "civilian"])
    })
  ).max(200),
  aircraft: z.array(
    z.object({
      id: z.string().min(1),
      icao24: z.string().regex(/^~?[0-9a-fA-F]{6}$/),
      callsign: z.string().min(1).max(16).optional(),
      registration: z.string().min(1).max(24).optional(),
      aircraftType: z.string().min(1).max(80).optional(),
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      altitudeFt: z.number().min(-1500).max(100000).optional(),
      groundSpeedKt: z.number().min(0).max(1200).optional(),
      riskLevel: riskLevelSchema,
      classification: z.enum(["military", "government", "commercial", "private", "unknown"]),
      emergency: z.boolean()
    })
  ).max(200).default([])
});

export const analysisSummarySchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["mock", "live"]),
  model: z.string().min(1).optional(),
  summary: z.string().min(1).max(1200),
  riskLevel: riskLevelSchema,
  keyFindings: z.array(z.string().min(1).max(240)).min(1).max(8),
  recommendedActions: z.array(z.string().min(1).max(240)).min(1).max(8),
  evidence: z.array(z.string().min(1).max(240)).min(1).max(8),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  area: analysisAreaResultSchema.optional(),
  generatedAt: z.string().datetime(),
  requestId: z.string().min(1).optional()
});

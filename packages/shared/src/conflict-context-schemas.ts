import { z } from "zod";
import { analysisAreaBoundsSchema, riskLevelSchema } from "./schemas";

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

export const conflictContextSourceSchema = z.object({
  title: z.string().min(1).max(120),
  url: publicHttpUrlSchema,
  attribution: z.string().min(1).max(180)
});

export const conflictEventSchema = z.object({
  id: z.string().min(1).max(140),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventType: z.string().min(1).max(80),
  subEventType: z.string().min(1).max(100).optional(),
  disorderType: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  adminArea: z.string().min(1).max(140).optional(),
  location: z.string().min(1).max(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geoPrecision: z.number().int().min(1).max(3).optional(),
  geocodingConfidence: z.enum(["high", "medium", "low", "unknown"]),
  fatalities: z.number().int().nonnegative(),
  severity: riskLevelSchema,
  sourceName: z.string().min(1).max(180).optional(),
  sourceScale: z.string().min(1).max(80).optional(),
  sourceUrl: publicHttpUrlSchema.optional(),
  notes: z.string().min(1).max(600).optional()
});

export const conflictContextResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["off", "mock", "live"]),
  provider: z.enum(["acled", "gdelt", "ucdp", "custom", "mock"]),
  source: conflictContextSourceSchema,
  generatedAt: z.string().datetime(),
  cached: z.boolean(),
  area: analysisAreaBoundsSchema.optional(),
  lookbackDays: z.number().int().min(1).max(90),
  events: z.array(conflictEventSchema).max(200),
  summary: z.object({
    count: z.number().int().nonnegative(),
    protestCount: z.number().int().nonnegative(),
    riotCount: z.number().int().nonnegative(),
    politicalViolenceCount: z.number().int().nonnegative(),
    fatalityCount: z.number().int().nonnegative(),
    highSeverityCount: z.number().int().nonnegative(),
    latestEventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),
  risk: z.object({
    level: riskLevelSchema,
    reasons: z.array(z.string().min(1).max(220)).min(1).max(5)
  }),
  limitations: z.array(z.string().min(1).max(320)).min(1).max(6),
  error: z.string().min(1).max(260).optional()
});

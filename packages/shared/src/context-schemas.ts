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

export const marineWeatherSourceSchema = z.object({
  title: z.string().min(1).max(120),
  url: publicHttpUrlSchema,
  attribution: z.string().min(1).max(160)
});

export const marineWeatherLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().min(1).max(120).optional()
});

export const marineWeatherConditionSchema = z.object({
  time: z.string().datetime(),
  waveHeightM: z.number().nonnegative().optional(),
  waveDirectionDeg: z.number().min(0).max(360).optional(),
  wavePeriodSeconds: z.number().nonnegative().optional(),
  windWaveHeightM: z.number().nonnegative().optional(),
  swellWaveHeightM: z.number().nonnegative().optional(),
  swellWaveDirectionDeg: z.number().min(0).max(360).optional(),
  swellWavePeriodSeconds: z.number().nonnegative().optional(),
  seaSurfaceTemperatureC: z.number().min(-5).max(45).optional(),
  oceanCurrentVelocityKt: z.number().nonnegative().optional(),
  oceanCurrentDirectionDeg: z.number().min(0).max(360).optional()
});

export const marineWeatherRiskSchema = z.object({
  level: riskLevelSchema,
  reasons: z.array(z.string().min(1).max(180)).min(1).max(5)
});

export const marineWeatherResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["mock", "live"]),
  source: marineWeatherSourceSchema,
  generatedAt: z.string().datetime(),
  cached: z.boolean(),
  area: analysisAreaBoundsSchema.optional(),
  location: marineWeatherLocationSchema,
  current: marineWeatherConditionSchema.optional(),
  forecast: z.array(marineWeatherConditionSchema).max(12).default([]),
  risk: marineWeatherRiskSchema,
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6),
  error: z.string().min(1).max(240).optional()
});

export const fireContextSourceSchema = z.object({
  title: z.string().min(1).max(120),
  url: publicHttpUrlSchema,
  attribution: z.string().min(1).max(180)
});

export const fireAnomalySchema = z.object({
  id: z.string().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  acquiredAt: z.string().datetime(),
  confidence: z.enum(["low", "nominal", "high", "unknown"]),
  rawConfidence: z.string().min(1).max(24).optional(),
  satellite: z.string().min(1).max(40).optional(),
  instrument: z.string().min(1).max(40).optional(),
  version: z.string().min(1).max(40).optional(),
  dayNight: z.enum(["day", "night", "unknown"]),
  brightnessKelvin: z.number().optional(),
  fireRadiativePowerMw: z.number().nonnegative().optional(),
  scanKm: z.number().nonnegative().optional(),
  trackKm: z.number().nonnegative().optional()
});

export const fireContextResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["mock", "live"]),
  source: fireContextSourceSchema,
  generatedAt: z.string().datetime(),
  cached: z.boolean(),
  area: analysisAreaBoundsSchema.optional(),
  sourceDataset: z.string().min(1).max(40),
  dayRange: z.number().int().min(1).max(5),
  detections: z.array(fireAnomalySchema).max(500),
  summary: z.object({
    count: z.number().int().nonnegative(),
    highConfidenceCount: z.number().int().nonnegative(),
    dayCount: z.number().int().nonnegative(),
    nightCount: z.number().int().nonnegative(),
    maxFireRadiativePowerMw: z.number().nonnegative().optional(),
    latestAcquiredAt: z.string().datetime().optional()
  }),
  risk: marineWeatherRiskSchema,
  limitations: z.array(z.string().min(1).max(260)).min(1).max(6),
  error: z.string().min(1).max(240).optional()
});

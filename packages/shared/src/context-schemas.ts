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

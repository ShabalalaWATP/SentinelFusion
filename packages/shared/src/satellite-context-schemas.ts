import { z } from "zod";
import { analysisAreaBoundsSchema } from "./schemas";

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

export const satelliteContextSourceSchema = z.object({
  title: z.string().min(1).max(120),
  url: publicHttpUrlSchema,
  attribution: z.string().min(1).max(180)
});

export const satelliteSnapshotSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
  layerId: z.string().min(1).max(120),
  imageUrl: publicHttpUrlSchema.optional(),
  acquiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(["image/jpeg", "image/png"]),
  width: z.number().int().min(128).max(1024),
  height: z.number().int().min(128).max(1024),
  projection: z.enum(["EPSG:4326"]),
  area: analysisAreaBoundsSchema
});

export const satelliteContextResponseSchema = z.object({
  status: z.enum(["ok", "not_configured", "error"]),
  mode: z.enum(["off", "mock", "live"]),
  provider: z.enum(["nasa-gibs", "custom", "mock"]),
  source: satelliteContextSourceSchema,
  generatedAt: z.string().datetime(),
  cached: z.boolean(),
  area: analysisAreaBoundsSchema.optional(),
  snapshot: satelliteSnapshotSchema.optional(),
  limitations: z.array(z.string().min(1).max(300)).min(1).max(6),
  error: z.string().min(1).max(260).optional()
});

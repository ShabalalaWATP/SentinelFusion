import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import {
  airportContextAreaLimitError,
  maxAirportSearchRadiusKm
} from "../context/airport-context-limits";
import type { IAirportContextService } from "../domain/interfaces";

const querySchema = z.object({
  south: z.coerce.number().optional(),
  west: z.coerce.number().optional(),
  north: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(maxAirportSearchRadiusKm).optional(),
  aircraftId: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(120).optional()
});

type AirportContextRouteDependencies = {
  service: IAirportContextService;
};

export async function registerAirportContextRoute(
  app: FastifyInstance,
  dependencies: AirportContextRouteDependencies
): Promise<void> {
  app.get("/context/airports", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Airport context query is invalid." });
    }

    const areaFields = [query.data.south, query.data.west, query.data.north, query.data.east];
    const pointFields = [query.data.latitude, query.data.longitude];
    const hasArea = areaFields.every((value) => value !== undefined);
    const hasPartialArea = areaFields.some((value) => value !== undefined);
    const hasPoint = pointFields.every((value) => value !== undefined);
    const hasPartialPoint = pointFields.some((value) => value !== undefined);

    if (
      (hasArea && hasPoint) ||
      (!hasArea && !hasPoint) ||
      hasPartialArea !== hasArea ||
      hasPartialPoint !== hasPoint
    ) {
      return reply.code(400).send({ error: "Provide either area bounds or latitude/longitude." });
    }

    if (hasPoint) {
      const focus = {
        latitude: query.data.latitude!,
        longitude: query.data.longitude!,
        ...(query.data.radiusKm === undefined ? {} : { radiusKm: query.data.radiusKm }),
        ...(query.data.aircraftId === undefined ? {} : { aircraftId: query.data.aircraftId }),
        ...(query.data.label === undefined ? {} : { label: query.data.label })
      };

      return dependencies.service.getNearbyAirports(focus);
    }

    const bounds = analysisAreaBoundsSchema.safeParse({
      south: query.data.south,
      west: query.data.west,
      north: query.data.north,
      east: query.data.east
    });
    if (!bounds.success) {
      return reply.code(400).send({ error: "Airport context bounds are invalid." });
    }

    const limitError = airportContextAreaLimitError(bounds.data);
    if (limitError) {
      return reply.code(400).send({ error: limitError });
    }

    return dependencies.service.getAreaAirports(bounds.data);
  });
}

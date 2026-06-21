import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import { airspaceContextAreaLimitError } from "../context/airspace-context-limits";
import type { IAirspaceContextService } from "../domain/interfaces";

const querySchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number()
});

type AirspaceContextRouteDependencies = {
  service: IAirspaceContextService;
};

export async function registerAirspaceContextRoute(
  app: FastifyInstance,
  dependencies: AirspaceContextRouteDependencies
): Promise<void> {
  app.get("/context/airspace", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Airspace context bounds are invalid." });
    }

    const bounds = analysisAreaBoundsSchema.safeParse(query.data);
    if (!bounds.success) {
      return reply.code(400).send({ error: "Airspace context bounds are invalid." });
    }

    const limitError = airspaceContextAreaLimitError(bounds.data);
    if (limitError) {
      return reply.code(413).send({ error: limitError });
    }

    return dependencies.service.getAreaAirspace(bounds.data);
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import type { ISatelliteContextService } from "../domain/interfaces";

const querySchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number()
});

type SatelliteContextRouteDependencies = {
  service: ISatelliteContextService;
};

export async function registerSatelliteContextRoute(
  app: FastifyInstance,
  dependencies: SatelliteContextRouteDependencies
): Promise<void> {
  app.get("/context/satellite-snapshot", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Satellite context bounds are invalid." });
    }

    const bounds = analysisAreaBoundsSchema.safeParse(query.data);
    if (!bounds.success) {
      return reply.code(400).send({ error: "Satellite context bounds are invalid." });
    }

    return dependencies.service.getAreaSnapshot(bounds.data);
  });
}

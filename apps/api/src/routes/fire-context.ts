import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import { fireContextAreaLimitError } from "../context/fire-context-limits";
import type { IFireContextService } from "../domain/interfaces";

const querySchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number()
});

type FireContextRouteDependencies = {
  service: IFireContextService;
};

export async function registerFireContextRoute(
  app: FastifyInstance,
  dependencies: FireContextRouteDependencies
): Promise<void> {
  app.get("/context/fire-anomalies", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Fire context bounds are invalid." });
    }

    const bounds = analysisAreaBoundsSchema.safeParse(query.data);
    if (!bounds.success) {
      return reply.code(400).send({ error: "Fire context bounds are invalid." });
    }

    const limitError = fireContextAreaLimitError(bounds.data);
    if (limitError) {
      return reply.code(400).send({ error: limitError });
    }

    return dependencies.service.getAreaFires(bounds.data);
  });
}

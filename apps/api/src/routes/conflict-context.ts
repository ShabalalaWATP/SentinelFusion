import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import type { IConflictContextService } from "../domain/interfaces";
import { isAuthorised } from "./auth";

const querySchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number()
});

type ConflictContextRouteDependencies = {
  analysisApiToken?: string;
  service: IConflictContextService;
};

export async function registerConflictContextRoute(
  app: FastifyInstance,
  dependencies: ConflictContextRouteDependencies
): Promise<void> {
  app.get("/context/conflict-events", async (request, reply) => {
    if (!isAuthorised(request, dependencies.analysisApiToken)) {
      return reply.code(401).send({ error: "Analysis token is required." });
    }

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Conflict context bounds are invalid." });
    }

    const bounds = analysisAreaBoundsSchema.safeParse(query.data);
    if (!bounds.success) {
      return reply.code(400).send({ error: "Conflict context bounds are invalid." });
    }

    return dependencies.service.getAreaConflict(bounds.data);
  });
}

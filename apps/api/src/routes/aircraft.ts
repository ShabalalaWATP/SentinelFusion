import type { FlightStreamStatus } from "@aisstream/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  IAircraftAnalyticsService,
  IAircraftIntelService,
  IAircraftRepository
} from "../domain/interfaces";
import { isAuthorised } from "./auth";

const aircraftParamsSchema = z.object({
  id: z.string().min(1).max(80)
});

type AircraftRouteDependencies = {
  repository: IAircraftRepository;
  analytics: IAircraftAnalyticsService;
  getStreamStatus?: () => FlightStreamStatus;
  intelService?: IAircraftIntelService;
  analysisApiToken?: string;
};

export async function registerAircraftRoutes(
  app: FastifyInstance,
  dependencies: AircraftRouteDependencies
): Promise<void> {
  app.get("/aircraft", async () => {
    const aircraft = dependencies.repository.getAll();
    const snapshot = {
      aircraft,
      metrics: dependencies.analytics.calculate(aircraft)
    };

    return dependencies.getStreamStatus
      ? {
          ...snapshot,
          stream: dependencies.getStreamStatus()
        }
      : snapshot;
  });

  app.post("/aircraft/:id/intel", async (request, reply) => {
    if (!isAuthorised(request, dependencies.analysisApiToken)) {
      return reply.code(401).send({ error: "Analysis token is required." });
    }

    if (!dependencies.intelService) {
      return reply.code(503).send({ error: "Aircraft intel service is unavailable." });
    }

    const parsed = aircraftParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Aircraft id is invalid." });
    }

    const aircraft = dependencies.repository.getById(parsed.data.id);
    if (!aircraft) {
      return reply.code(404).send({ error: "Requested aircraft was not found." });
    }

    return dependencies.intelService.enrich(aircraft);
  });
}

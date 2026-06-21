import type { FastifyInstance } from "fastify";
import type { AisStreamStatus } from "@aisstream/shared";
import { z } from "zod";
import type {
  IVesselAnalyticsService,
  IVesselIntelService,
  IVesselRepository
} from "../domain/interfaces";
import { isAuthorised } from "./auth";

const vesselParamsSchema = z.object({
  id: z.string().min(1).max(80)
});

type VesselRouteDependencies = {
  repository: IVesselRepository;
  analytics: IVesselAnalyticsService;
  getStreamStatus?: () => AisStreamStatus;
  intelService?: IVesselIntelService;
  analysisApiToken?: string;
};

export async function registerVesselRoutes(
  app: FastifyInstance,
  dependencies: VesselRouteDependencies
): Promise<void> {
  app.get("/vessels", async () => {
    const vessels = dependencies.repository.getAll();
    const snapshot = {
      vessels,
      metrics: dependencies.analytics.calculate(vessels)
    };

    return dependencies.getStreamStatus
      ? {
          ...snapshot,
          stream: dependencies.getStreamStatus()
        }
      : snapshot;
  });

  app.post("/vessels/:id/intel", async (request, reply) => {
    if (!isAuthorised(request, dependencies.analysisApiToken)) {
      return reply.code(401).send({ error: "Analysis token is required." });
    }

    if (!dependencies.intelService) {
      return reply.code(503).send({ error: "Vessel intel service is unavailable." });
    }

    const parsed = vesselParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Vessel id is invalid." });
    }

    const vessel = dependencies.repository.getById(parsed.data.id);
    if (!vessel) {
      return reply.code(404).send({ error: "Requested vessel was not found." });
    }

    return dependencies.intelService.enrich(vessel);
  });

}

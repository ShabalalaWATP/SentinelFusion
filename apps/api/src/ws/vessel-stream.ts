import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/environment";
import type {
  IRealtimeBroadcaster,
  IVesselAnalyticsService,
  IVesselRepository
} from "../domain/interfaces";
import { isAllowedOrigin } from "./origin";

type VesselStreamDependencies = {
  analytics: IVesselAnalyticsService;
  broadcaster: IRealtimeBroadcaster;
  config: AppConfig;
  repository: IVesselRepository;
};

export async function registerVesselStream(
  app: FastifyInstance,
  dependencies: VesselStreamDependencies
): Promise<void> {
  app.get(
    "/ws/vessels",
    {
      websocket: true,
      preValidation: async (request, reply) => {
        const origin = request.headers.origin;
        if (!isAllowedOrigin(origin, dependencies.config.corsOrigins)) {
          reply.code(403).send({ error: "WebSocket origin is not allowed" });
        }
      }
    },
    (socket) => {
      dependencies.broadcaster.addClient(socket);
      const vessels = dependencies.repository.getAll();
      socket.send(
        JSON.stringify({
          kind: "snapshot",
          vessels,
          metrics: dependencies.analytics.calculate(vessels),
          sentAt: new Date().toISOString()
        })
      );
    }
  );
}

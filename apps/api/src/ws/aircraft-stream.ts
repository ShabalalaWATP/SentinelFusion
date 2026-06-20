import type { FastifyInstance } from "fastify";
import type {
  IAircraftAnalyticsService,
  IAircraftRealtimeBroadcaster,
  IAircraftRepository
} from "../domain/interfaces";
import type { AppConfig } from "../config/environment";
import { isAllowedOrigin } from "./origin";

type AircraftStreamDependencies = {
  analytics: IAircraftAnalyticsService;
  broadcaster: IAircraftRealtimeBroadcaster;
  config: AppConfig;
  repository: IAircraftRepository;
};

export async function registerAircraftStream(
  app: FastifyInstance,
  dependencies: AircraftStreamDependencies
): Promise<void> {
  app.get(
    "/ws/aircraft",
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
      const aircraft = dependencies.repository.getAll();
      socket.send(
        JSON.stringify({
          kind: "snapshot",
          aircraft,
          metrics: dependencies.analytics.calculate(aircraft),
          sentAt: new Date().toISOString()
        })
      );
    }
  );
}

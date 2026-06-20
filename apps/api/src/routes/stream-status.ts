import type { AisStreamStatus } from "@aisstream/shared";
import type { FastifyInstance } from "fastify";

export async function registerStreamStatusRoute(
  app: FastifyInstance,
  getStreamStatus: () => AisStreamStatus
): Promise<void> {
  app.get("/stream/status", async () => getStreamStatus());
}

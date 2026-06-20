import type { FlightStreamStatus } from "@aisstream/shared";
import type { FastifyInstance } from "fastify";

export async function registerFlightStatusRoute(
  app: FastifyInstance,
  getStreamStatus: () => FlightStreamStatus
): Promise<void> {
  app.get("/flight/status", async () => getStreamStatus());
}

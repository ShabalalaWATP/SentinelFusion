import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/environment";

export async function registerHealthRoute(
  app: FastifyInstance,
  config: AppConfig
): Promise<void> {
  app.get("/health", async () => ({
    status: "ok" as const,
    mode: config.aisMode,
    timestamp: new Date().toISOString()
  }));
}

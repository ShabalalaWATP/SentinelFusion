import type { FastifyServerOptions } from "fastify";
import type { AppConfig } from "./environment";

export function createLoggerOptions(
  config: AppConfig
): NonNullable<FastifyServerOptions["logger"]> {
  return {
    level: config.logLevel,
    redact: {
      censor: "[redacted]",
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "AISSTREAM_API_KEY",
        "OPENAI_API_KEY",
        "FLIGHT_API_KEY",
        "OPEN_SKY_CLIENT_SECRET",
        "*.aisstreamApiKey",
        "*.openaiApiKey",
        "*.flightApiKey",
        "*.openSkyClientSecret"
      ]
    }
  };
}

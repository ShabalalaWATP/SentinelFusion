import { z } from "zod";

const browserEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  VITE_WS_URL: z.string().url().default("ws://localhost:4000/ws/vessels"),
  VITE_FLIGHT_WS_URL: z.string().url().default("ws://localhost:4000/ws/aircraft")
});

const parsed = browserEnvSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/$/, ""),
  flightWsUrl: parsed.VITE_FLIGHT_WS_URL,
  wsUrl: parsed.VITE_WS_URL
};

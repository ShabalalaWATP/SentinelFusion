import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional()
);

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalised = value.trim().toLowerCase();
  if (["true", "yes", "on"].includes(normalised)) {
    return true;
  }

  if (["0", "false", "no", "off", ""].includes(normalised)) {
    return false;
  }

  return value;
}, z.boolean());

export type TrustProxyConfig = false | string | string[] | number;

const flightProviderSchema = z.enum(["mock", "opensky", "adsbexchange", "fr24", "flightaware"]);

const rawConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY: z.string().default("false"),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:5173"),
  AIS_MODE: z.enum(["mock", "replay", "live"]).default("live"),
  MOCK_STREAM_INTERVAL_MS: z.coerce.number().int().min(100).default(1000),
  AISSTREAM_URL: z.string().url().default("wss://stream.aisstream.io/v0/stream"),
  AISSTREAM_BBOXES: z.string().default("[[[-90,-180],[90,180]]]"),
  AISSTREAM_FILTER_MMSI: z.string().optional(),
  AISSTREAM_FILTER_MESSAGE_TYPES: z
    .string()
    .default("PositionReport,StandardClassBPositionReport,ExtendedClassBPositionReport,ShipStaticData,StaticDataReport"),
  AISSTREAM_RECONNECT_BASE_MS: z.coerce.number().int().min(250).default(1000),
  AISSTREAM_RECONNECT_MAX_MS: z.coerce.number().int().min(1000).default(30000),
  AISSTREAM_HEARTBEAT_MS: z.coerce.number().int().min(5000).default(30000),
  AIS_REPLAY_FILE: optionalNonEmptyString,
  FLIGHT_MODE: z.enum(["mock", "replay", "live"]).default("live"),
  FLIGHT_PROVIDER: flightProviderSchema.default("opensky"),
  FLIGHT_API_BASE_URL: optionalNonEmptyString,
  FLIGHT_API_KEY: optionalNonEmptyString,
  FLIGHT_BBOXES: z.string().default("[[[-90,-180],[90,180]]]"),
  FLIGHT_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(90000),
  FLIGHT_STALE_AFTER_SECONDS: z.coerce.number().int().min(15).default(60),
  FLIGHT_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  OPEN_SKY_CLIENT_ID: optionalNonEmptyString,
  OPEN_SKY_CLIENT_SECRET: optionalNonEmptyString,
  ANALYSIS_MODE: z.enum(["mock", "live"]).default("live"),
  ALLOW_UNAUTHENTICATED_ANALYSIS: booleanEnv.default(false),
  ANALYSIS_API_TOKEN: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(16).optional()
  ),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).default(20000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_WINDOW: z.string().min(1).default("1 minute"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  AISSTREAM_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  trustProxy: TrustProxyConfig;
  corsOrigins: string[];
  aisMode: "mock" | "replay" | "live";
  mockStreamIntervalMs: number;
  aisstreamUrl: string;
  aisstreamBoundingBoxes: AisBoundingBox[];
  aisstreamFilterMMSI: string[];
  aisstreamFilterMessageTypes: string[];
  aisstreamReconnectBaseMs: number;
  aisstreamReconnectMaxMs: number;
  aisstreamHeartbeatMs: number;
  aisReplayFile?: string;
  flightMode: "mock" | "replay" | "live";
  flightProvider: "mock" | "opensky" | "adsbexchange" | "fr24" | "flightaware";
  flightApiBaseUrl?: string;
  flightApiKey?: string;
  flightBoundingBoxes: AisBoundingBox[];
  flightPollIntervalMs: number;
  flightStaleAfterSeconds: number;
  flightProviderTimeoutMs: number;
  openSkyClientId?: string;
  openSkyClientSecret?: string;
  analysisMode: "mock" | "live";
  analysisApiToken?: string;
  openaiModel: string;
  openaiTimeoutMs: number;
  rateLimitMax: number;
  rateLimitWindow: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  aisstreamApiKey?: string;
  openaiApiKey?: string;
};

export type AisBoundingBox = [[number, number], [number, number]];

export function parseAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawConfigSchema.parse(source);
  const corsOrigins = parsed.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const aisstreamBoundingBoxes = parseBoundingBoxes(parsed.AISSTREAM_BBOXES);
  const flightBoundingBoxes = parseBoundingBoxes(parsed.FLIGHT_BBOXES);
  const aisstreamFilterMMSI = parseCsv(parsed.AISSTREAM_FILTER_MMSI).filter((value) =>
    /^\d{9}$/.test(value)
  );
  const aisstreamFilterMessageTypes = unique(parseCsv(parsed.AISSTREAM_FILTER_MESSAGE_TYPES));

  if (parsed.AIS_MODE === "live" && !parsed.AISSTREAM_API_KEY) {
    throw new Error("AISSTREAM_API_KEY is required when AIS_MODE=live.");
  }

  if (parsed.FLIGHT_MODE === "live" && parsed.FLIGHT_PROVIDER === "mock") {
    throw new Error("FLIGHT_PROVIDER must select a live provider when FLIGHT_MODE=live.");
  }

  if (
    parsed.FLIGHT_MODE === "live" &&
    ["adsbexchange", "fr24", "flightaware"].includes(parsed.FLIGHT_PROVIDER) &&
    !parsed.FLIGHT_API_KEY
  ) {
    throw new Error("FLIGHT_API_KEY is required for the selected live flight provider.");
  }

  if (parsed.ANALYSIS_MODE === "live" && !parsed.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when ANALYSIS_MODE=live.");
  }

  if (parsed.ANALYSIS_MODE === "live" && !parsed.ANALYSIS_API_TOKEN) {
    if (parsed.NODE_ENV === "production") {
      throw new Error("ANALYSIS_API_TOKEN is required in production live analysis mode.");
    }

    if (!parsed.ALLOW_UNAUTHENTICATED_ANALYSIS) {
      throw new Error(
        "ANALYSIS_API_TOKEN is required when ANALYSIS_MODE=live. Set ALLOW_UNAUTHENTICATED_ANALYSIS=true only for local development."
      );
    }
  }

  const config: AppConfig = {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    corsOrigins,
    aisMode: parsed.AIS_MODE,
    mockStreamIntervalMs: parsed.MOCK_STREAM_INTERVAL_MS,
    aisstreamUrl: parsed.AISSTREAM_URL,
    aisstreamBoundingBoxes,
    aisstreamFilterMMSI,
    aisstreamFilterMessageTypes,
    aisstreamReconnectBaseMs: parsed.AISSTREAM_RECONNECT_BASE_MS,
    aisstreamReconnectMaxMs: parsed.AISSTREAM_RECONNECT_MAX_MS,
    aisstreamHeartbeatMs: parsed.AISSTREAM_HEARTBEAT_MS,
    flightMode: parsed.FLIGHT_MODE,
    flightProvider: parsed.FLIGHT_PROVIDER,
    flightBoundingBoxes,
    flightPollIntervalMs: parsed.FLIGHT_POLL_INTERVAL_MS,
    flightStaleAfterSeconds: parsed.FLIGHT_STALE_AFTER_SECONDS,
    flightProviderTimeoutMs: parsed.FLIGHT_PROVIDER_TIMEOUT_MS,
    analysisMode: parsed.ANALYSIS_MODE,
    openaiModel: parsed.OPENAI_MODEL,
    openaiTimeoutMs: parsed.OPENAI_TIMEOUT_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindow: parsed.RATE_LIMIT_WINDOW,
    logLevel: parsed.LOG_LEVEL
  };

  if (parsed.AISSTREAM_API_KEY) {
    config.aisstreamApiKey = parsed.AISSTREAM_API_KEY;
  }

  if (parsed.AIS_REPLAY_FILE) {
    config.aisReplayFile = parsed.AIS_REPLAY_FILE;
  }

  if (parsed.FLIGHT_API_BASE_URL) {
    config.flightApiBaseUrl = parsed.FLIGHT_API_BASE_URL;
  }

  if (parsed.FLIGHT_API_KEY) {
    config.flightApiKey = parsed.FLIGHT_API_KEY;
  }

  if (parsed.OPEN_SKY_CLIENT_ID) {
    config.openSkyClientId = parsed.OPEN_SKY_CLIENT_ID;
  }

  if (parsed.OPEN_SKY_CLIENT_SECRET) {
    config.openSkyClientSecret = parsed.OPEN_SKY_CLIENT_SECRET;
  }

  if (parsed.ANALYSIS_API_TOKEN) {
    config.analysisApiToken = parsed.ANALYSIS_API_TOKEN;
  }

  if (parsed.OPENAI_API_KEY) {
    config.openaiApiKey = parsed.OPENAI_API_KEY;
  }

  return config;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function parseTrustProxy(value: string): TrustProxyConfig {
  const trimmed = value.trim();
  const normalised = trimmed.toLowerCase();

  if (["", "0", "false", "no", "off"].includes(normalised)) {
    return false;
  }

  if (["true", "yes", "on"].includes(normalised)) {
    throw new Error(
      "TRUST_PROXY=true is unsafe because it trusts spoofable forwarded headers. Use false, a hop count such as 1, or trusted proxy addresses/CIDRs."
    );
  }

  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    if (hops > 0) {
      return hops;
    }
  }

  const entries = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return false;
  }

  return entries.length === 1 ? entries[0]! : entries;
}

function parseBoundingBoxes(value: string): AisBoundingBox[] {
  const parsed = z
    .array(
      z.tuple([
        z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
        z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
      ])
    )
    .min(1)
    .parse(JSON.parse(value));

  return parsed;
}

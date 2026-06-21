import { z } from "zod";
import {
  parseBoundingBoxes,
  parseCsv,
  parseTrustProxy,
  unique,
  type AisBoundingBox,
  type TrustProxyConfig
} from "./environment-parsers";

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

export type { AisBoundingBox, TrustProxyConfig } from "./environment-parsers";

const flightProviderSchema = z.enum(["mock", "opensky", "adsbexchange", "fr24", "flightaware"]);
const firmsSourceSchema = z.enum([
  "MODIS_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
  "VIIRS_SNPP_NRT"
]);

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
  MARINE_WEATHER_MODE: z.enum(["off", "mock", "live"]).default("live"),
  MARINE_WEATHER_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  MARINE_WEATHER_CACHE_SECONDS: z.coerce.number().int().min(0).default(900),
  MARINE_WEATHER_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(200),
  FIRMS_MODE: z.enum(["off", "mock", "live"]).default("live"),
  FIRMS_MAP_KEY: optionalNonEmptyString,
  FIRMS_SOURCE: firmsSourceSchema.default("VIIRS_SNPP_NRT"),
  FIRMS_DAY_RANGE: z.coerce.number().int().min(1).max(5).default(1),
  FIRMS_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  FIRMS_CACHE_SECONDS: z.coerce.number().int().min(0).default(900),
  FIRMS_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(200),
  FIRMS_MAX_DETECTIONS: z.coerce.number().int().min(1).max(500).default(150),
  AIRPORT_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("live"),
  AIRPORT_CONTEXT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  AIRPORT_CONTEXT_CACHE_SECONDS: z.coerce.number().int().min(0).default(86400),
  AIRPORT_CONTEXT_MAX_RESULTS: z.coerce.number().int().min(1).max(50).default(8),
  AIRPORT_CONTEXT_MAX_RUNWAYS_PER_AIRPORT: z.coerce.number().int().min(0).max(12).default(4),
  AIRSPACE_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("off"),
  AIRSPACE_CONTEXT_MAX_RESULTS: z.coerce.number().int().min(1).max(100).default(25),
  FLIGHT_ROUTE_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("off"),
  FLIGHT_ROUTE_CONTEXT_PROVIDER: z.enum(["flightaware", "fr24", "custom"]).default("flightaware"),
  FLIGHT_ROUTE_CONTEXT_MAX_WAYPOINTS: z.coerce.number().int().min(1).max(120).default(60),
  SANCTIONS_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("off"),
  SANCTIONS_CONTEXT_PROVIDER: z.enum(["opensanctions", "custom"]).default("opensanctions"),
  SANCTIONS_CONTEXT_MAX_RESULTS: z.coerce.number().int().min(1).max(50).default(10),
  CONFLICT_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("live"),
  CONFLICT_CONTEXT_PROVIDER: z.enum(["acled"]).default("acled"),
  CONFLICT_CONTEXT_LOOKBACK_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  CONFLICT_CONTEXT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  CONFLICT_CONTEXT_CACHE_SECONDS: z.coerce.number().int().min(0).default(900),
  CONFLICT_CONTEXT_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(200),
  CONFLICT_CONTEXT_MAX_RESULTS: z.coerce.number().int().min(1).max(200).default(50),
  ACLED_ACCESS_TOKEN: optionalNonEmptyString,
  ACLED_USERNAME: optionalNonEmptyString,
  ACLED_PASSWORD: optionalNonEmptyString,
  SATELLITE_CONTEXT_MODE: z.enum(["off", "mock", "live"]).default("live"),
  SATELLITE_CONTEXT_PROVIDER: z.enum(["nasa-gibs", "custom"]).default("nasa-gibs"),
  SATELLITE_CONTEXT_LAYER: z.string().min(1).max(120).default("VIIRS_SNPP_CorrectedReflectance_TrueColor"),
  SATELLITE_CONTEXT_DATE_OFFSET_DAYS: z.coerce.number().int().min(0).max(30).default(1),
  SATELLITE_CONTEXT_IMAGE_SIZE: z.coerce.number().int().min(256).max(1024).default(512),
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
  marineWeatherMode: "off" | "mock" | "live";
  marineWeatherTimeoutMs: number;
  marineWeatherCacheSeconds: number;
  marineWeatherCacheMaxEntries: number;
  firmsMode: "off" | "mock" | "live";
  firmsMapKey?: string;
  firmsSource: "MODIS_NRT" | "VIIRS_NOAA20_NRT" | "VIIRS_NOAA21_NRT" | "VIIRS_SNPP_NRT";
  firmsDayRange: number;
  firmsTimeoutMs: number;
  firmsCacheSeconds: number;
  firmsCacheMaxEntries: number;
  firmsMaxDetections: number;
  airportContextMode: "off" | "mock" | "live";
  airportContextTimeoutMs: number;
  airportContextCacheSeconds: number;
  airportContextMaxResults: number;
  airportContextMaxRunwaysPerAirport: number;
  airspaceContextMode: "off" | "mock" | "live";
  airspaceContextMaxResults: number;
  flightRouteContextMode: "off" | "mock" | "live";
  flightRouteContextProvider: "flightaware" | "fr24" | "custom";
  flightRouteContextMaxWaypoints: number;
  sanctionsContextMode: "off" | "mock" | "live";
  sanctionsContextProvider: "opensanctions" | "custom";
  sanctionsContextMaxResults: number;
  conflictContextMode?: "off" | "mock" | "live";
  conflictContextProvider?: "acled";
  conflictContextLookbackDays?: number;
  conflictContextTimeoutMs?: number;
  conflictContextCacheSeconds?: number;
  conflictContextCacheMaxEntries?: number;
  conflictContextMaxResults?: number;
  acledAccessToken?: string;
  acledUsername?: string;
  acledPassword?: string;
  satelliteContextMode: "off" | "mock" | "live";
  satelliteContextProvider: "nasa-gibs" | "custom";
  satelliteContextLayer: string;
  satelliteContextDateOffsetDays: number;
  satelliteContextImageSize: number;
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

  if (
    parsed.CONFLICT_CONTEXT_MODE === "live" &&
    (parsed.ACLED_ACCESS_TOKEN || parsed.ACLED_USERNAME || parsed.ACLED_PASSWORD) &&
    !parsed.ANALYSIS_API_TOKEN
  ) {
    throw new Error(
      "ANALYSIS_API_TOKEN is required when CONFLICT_CONTEXT_MODE=live uses ACLED credentials."
    );
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
    marineWeatherMode: parsed.MARINE_WEATHER_MODE,
    marineWeatherTimeoutMs: parsed.MARINE_WEATHER_TIMEOUT_MS,
    marineWeatherCacheSeconds: parsed.MARINE_WEATHER_CACHE_SECONDS,
    marineWeatherCacheMaxEntries: parsed.MARINE_WEATHER_CACHE_MAX_ENTRIES,
    firmsMode: parsed.FIRMS_MODE,
    firmsSource: parsed.FIRMS_SOURCE,
    firmsDayRange: parsed.FIRMS_DAY_RANGE,
    firmsTimeoutMs: parsed.FIRMS_TIMEOUT_MS,
    firmsCacheSeconds: parsed.FIRMS_CACHE_SECONDS,
    firmsCacheMaxEntries: parsed.FIRMS_CACHE_MAX_ENTRIES,
    firmsMaxDetections: parsed.FIRMS_MAX_DETECTIONS,
    airportContextMode: parsed.AIRPORT_CONTEXT_MODE,
    airportContextTimeoutMs: parsed.AIRPORT_CONTEXT_TIMEOUT_MS,
    airportContextCacheSeconds: parsed.AIRPORT_CONTEXT_CACHE_SECONDS,
    airportContextMaxResults: parsed.AIRPORT_CONTEXT_MAX_RESULTS,
    airportContextMaxRunwaysPerAirport: parsed.AIRPORT_CONTEXT_MAX_RUNWAYS_PER_AIRPORT,
    airspaceContextMode: parsed.AIRSPACE_CONTEXT_MODE,
    airspaceContextMaxResults: parsed.AIRSPACE_CONTEXT_MAX_RESULTS,
    flightRouteContextMode: parsed.FLIGHT_ROUTE_CONTEXT_MODE,
    flightRouteContextProvider: parsed.FLIGHT_ROUTE_CONTEXT_PROVIDER,
    flightRouteContextMaxWaypoints: parsed.FLIGHT_ROUTE_CONTEXT_MAX_WAYPOINTS,
    sanctionsContextMode: parsed.SANCTIONS_CONTEXT_MODE,
    sanctionsContextProvider: parsed.SANCTIONS_CONTEXT_PROVIDER,
    sanctionsContextMaxResults: parsed.SANCTIONS_CONTEXT_MAX_RESULTS,
    conflictContextMode: parsed.CONFLICT_CONTEXT_MODE,
    conflictContextProvider: parsed.CONFLICT_CONTEXT_PROVIDER,
    conflictContextLookbackDays: parsed.CONFLICT_CONTEXT_LOOKBACK_DAYS,
    conflictContextTimeoutMs: parsed.CONFLICT_CONTEXT_TIMEOUT_MS,
    conflictContextCacheSeconds: parsed.CONFLICT_CONTEXT_CACHE_SECONDS,
    conflictContextCacheMaxEntries: parsed.CONFLICT_CONTEXT_CACHE_MAX_ENTRIES,
    conflictContextMaxResults: parsed.CONFLICT_CONTEXT_MAX_RESULTS,
    satelliteContextMode: parsed.SATELLITE_CONTEXT_MODE,
    satelliteContextProvider: parsed.SATELLITE_CONTEXT_PROVIDER,
    satelliteContextLayer: parsed.SATELLITE_CONTEXT_LAYER,
    satelliteContextDateOffsetDays: parsed.SATELLITE_CONTEXT_DATE_OFFSET_DAYS,
    satelliteContextImageSize: parsed.SATELLITE_CONTEXT_IMAGE_SIZE,
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

  if (parsed.FIRMS_MAP_KEY) {
    config.firmsMapKey = parsed.FIRMS_MAP_KEY;
  }

  if (parsed.ACLED_ACCESS_TOKEN) {
    config.acledAccessToken = parsed.ACLED_ACCESS_TOKEN;
  }

  if (parsed.ACLED_USERNAME) {
    config.acledUsername = parsed.ACLED_USERNAME;
  }

  if (parsed.ACLED_PASSWORD) {
    config.acledPassword = parsed.ACLED_PASSWORD;
  }

  if (parsed.ANALYSIS_API_TOKEN) {
    config.analysisApiToken = parsed.ANALYSIS_API_TOKEN;
  }

  if (parsed.OPENAI_API_KEY) {
    config.openaiApiKey = parsed.OPENAI_API_KEY;
  }

  return config;
}

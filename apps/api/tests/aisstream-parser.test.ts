import { describe, expect, it } from "vitest";
import { AisReplayStreamClient } from "../src/ais/ais-replay-stream-client";
import { AisStreamStatusTracker } from "../src/ais/ais-stream-status-tracker";
import { parseAisStreamEnvelope } from "../src/ais/aisstream-message-parser";
import type { AppConfig } from "../src/config/environment";
import { parseAppConfig } from "../src/config/environment";

const baseConfig: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  trustProxy: false,
  corsOrigins: ["http://localhost:5173"],
  aisMode: "replay",
  mockStreamIntervalMs: 1000,
  aisstreamUrl: "wss://stream.aisstream.io/v0/stream",
  aisstreamBoundingBoxes: [[[-90, -180], [90, 180]]],
  aisstreamFilterMMSI: [],
  aisstreamFilterMessageTypes: ["PositionReport"],
  aisstreamReconnectBaseMs: 1000,
  aisstreamReconnectMaxMs: 30000,
  aisstreamHeartbeatMs: 30000,
  flightMode: "mock",
  flightProvider: "mock",
  flightBoundingBoxes: [[[-90, -180], [90, 180]]],
  flightPollIntervalMs: 5000,
  flightStaleAfterSeconds: 60,
  flightProviderTimeoutMs: 10000,
  marineWeatherMode: "mock",
  marineWeatherTimeoutMs: 10000,
  marineWeatherCacheSeconds: 900,
  marineWeatherCacheMaxEntries: 200,
  firmsMode: "mock",
  firmsSource: "VIIRS_SNPP_NRT",
  firmsDayRange: 1,
  firmsTimeoutMs: 10000,
  firmsCacheSeconds: 900,
  firmsCacheMaxEntries: 200,
  firmsMaxDetections: 150,
  airportContextMode: "mock",
  airportContextTimeoutMs: 10000,
  airportContextCacheSeconds: 86400,
  airportContextMaxResults: 8,
  airportContextMaxRunwaysPerAirport: 4,
  airspaceContextMode: "off",
  airspaceContextMaxResults: 25,
  flightRouteContextMode: "off",
  flightRouteContextProvider: "flightaware",
  flightRouteContextMaxWaypoints: 60,
  sanctionsContextMode: "off",
  sanctionsContextProvider: "opensanctions",
  sanctionsContextMaxResults: 10,
  analysisMode: "mock",
  openaiModel: "gpt-5.4-mini",
  openaiTimeoutMs: 20000,
  rateLimitMax: 100,
  rateLimitWindow: "1 minute",
  logLevel: "error"
};

describe("AISstream parsing", () => {
  it("normalises AISstream position report envelopes", () => {
    const result = parseAisStreamEnvelope({
      MessageType: "PositionReport",
      MetaData: {
        MMSI: 232001234,
        ShipName: "NORTHERN LIGHT",
        latitude: 51.95,
        longitude: 1.3,
        time_utc: "2026-06-11 10:00:00.000000 +0000 UTC"
      },
      Message: {
        PositionReport: {
          UserID: 232001234,
          Latitude: 51.95,
          Longitude: 1.3,
          Sog: 13.2,
          Cog: 76,
          TrueHeading: 74,
          NavigationalStatus: 0
        }
      }
    });

    expect(result).toMatchObject({
      kind: "message",
      message: {
        mmsi: "232001234",
        name: "NORTHERN LIGHT",
        speedOverGround: 13.2,
        courseOverGround: 76,
        timestamp: "2026-06-11T10:00:00.000Z"
      }
    });
  });

  it("surfaces AISstream API error frames", () => {
    expect(parseAisStreamEnvelope({ error: "Api Key Is Not Valid" })).toEqual({
      kind: "error",
      message: "Api Key Is Not Valid"
    });
  });

  it("replays recorded AISstream fixture messages", () => {
    const messages = new Set<string>();
    const client = new AisReplayStreamClient(baseConfig);

    const stop = client.subscribe((message) => {
      messages.add(message.mmsi);
    });
    stop();

    expect(messages.size).toBe(1);
    expect(messages.has("232001234")).toBe(true);
  });

  it("does not expose dropped AIS frame reasons as active stream errors", () => {
    const tracker = new AisStreamStatusTracker(baseConfig);
    tracker.record({ type: "state", state: "subscribed", connected: true });
    tracker.record({
      type: "message",
      sourceTimestamp: "2026-06-11T10:00:00.000Z"
    });
    tracker.record({
      type: "dropped",
      reason: "AISstream PositionReport frame lacked usable MMSI or position."
    });

    expect(tracker.snapshot()).toMatchObject({
      connected: true,
      errors: 0,
      messagesDropped: 1,
      messagesReceived: 1
    });
    expect(tracker.snapshot().lastError).toBeUndefined();
  });

  it("requires AISSTREAM_API_KEY for live AIS mode", () => {
    expect(() =>
      parseAppConfig({
        AIS_MODE: "live",
        ANALYSIS_MODE: "mock"
      } as NodeJS.ProcessEnv)
    ).toThrow("AISSTREAM_API_KEY is required");
  });

  it("requires OPENAI_API_KEY for live analysis mode", () => {
    expect(() =>
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "live"
      } as NodeJS.ProcessEnv)
    ).toThrow("OPENAI_API_KEY is required");
  });

  it("requires an analysis API token for production live analysis", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AIS_MODE: "mock",
        ANALYSIS_MODE: "live",
        OPENAI_API_KEY: "test-openai-key"
      } as NodeJS.ProcessEnv)
    ).toThrow("ANALYSIS_API_TOKEN is required");
  });

  it("requires an explicit local override for unauthenticated live analysis", () => {
    expect(() =>
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "live",
        OPENAI_API_KEY: "test-openai-key"
      } as NodeJS.ProcessEnv)
    ).toThrow("ALLOW_UNAUTHENTICATED_ANALYSIS=true");

    expect(
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "live",
        OPENAI_API_KEY: "test-openai-key",
        ALLOW_UNAUTHENTICATED_ANALYSIS: "true"
      } as NodeJS.ProcessEnv)
    ).toMatchObject({
      analysisMode: "live",
      openaiApiKey: "test-openai-key"
    });
  });

  it("rejects blanket trust for spoofable proxy headers", () => {
    expect(() =>
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "mock",
        TRUST_PROXY: "true"
      } as NodeJS.ProcessEnv)
    ).toThrow("TRUST_PROXY=true is unsafe");

    expect(
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "mock",
        TRUST_PROXY: "1"
      } as NodeJS.ProcessEnv)
    ).toMatchObject({
      trustProxy: 1
    });
  });

  it("validates live flight provider configuration", () => {
    expect(
      parseAppConfig({
        AISSTREAM_API_KEY: "test-ais-key",
        OPENAI_API_KEY: "test-openai-key",
        ALLOW_UNAUTHENTICATED_ANALYSIS: "true"
      } as NodeJS.ProcessEnv)
    ).toMatchObject({
      aisMode: "live",
      analysisMode: "live",
      flightMode: "live",
      flightProvider: "opensky"
    });

    expect(() =>
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "mock",
        FLIGHT_MODE: "live",
        FLIGHT_PROVIDER: "mock"
      } as NodeJS.ProcessEnv)
    ).toThrow("FLIGHT_PROVIDER must select a live provider");

    expect(() =>
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "mock",
        FLIGHT_MODE: "live",
        FLIGHT_PROVIDER: "adsbexchange"
      } as NodeJS.ProcessEnv)
    ).toThrow("FLIGHT_API_KEY is required");

    expect(
      parseAppConfig({
        AIS_MODE: "mock",
        ANALYSIS_MODE: "mock",
        FLIGHT_MODE: "live",
        FLIGHT_PROVIDER: "adsbexchange",
        FLIGHT_API_KEY: "test-flight-key"
      } as NodeJS.ProcessEnv)
    ).toMatchObject({
      flightMode: "live",
      flightProvider: "adsbexchange"
    });
  });
});

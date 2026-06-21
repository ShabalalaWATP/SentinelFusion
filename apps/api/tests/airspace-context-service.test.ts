import { describe, expect, it } from "vitest";
import { AirspaceContextService } from "../src/context/airspace-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T12:00:00.000Z";
const area = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

describe("airspace context service", () => {
  it("returns not configured by default instead of pretending live NOTAM data exists", async () => {
    const service = new AirspaceContextService(config(), () => new Date(generatedAt));

    const result = await service.getAreaAirspace(area);

    expect(result).toMatchObject({
      status: "not_configured",
      mode: "off",
      area,
      notices: [],
      summary: {
        count: 0,
        activeCount: 0,
        upcomingCount: 0,
        highSeverityCount: 0
      }
    });
    expect(result.limitations[0]).toContain("authorised FAA/SWIM or licensed provider");
  });

  it("returns deterministic mock notices only when mock mode is explicit", async () => {
    const service = new AirspaceContextService(
      config({ airspaceContextMode: "mock", airspaceContextMaxResults: 1 }),
      () => new Date(generatedAt)
    );

    const result = await service.getAreaAirspace(area);

    expect(result.status).toBe("ok");
    expect(result.mode).toBe("mock");
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0]).toMatchObject({
      type: "restricted_area",
      status: "active",
      severity: "medium"
    });
  });

  it("returns an error state for over-large areas before any provider adapter can run", async () => {
    const service = new AirspaceContextService(config(), () => new Date(generatedAt));

    const result = await service.getAreaAirspace({
      south: -40,
      west: -40,
      north: 40,
      east: 40
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Maximum latitude span");
  });
});

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: "test",
    host: "127.0.0.1",
    port: 0,
    trustProxy: false,
    corsOrigins: ["http://localhost:5173"],
    aisMode: "mock",
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
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { SanctionsScreeningService } from "../src/context/sanctions-screening-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T12:00:00.000Z";
const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  callSign: "ABCD",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  destination: "Felixstowe",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: generatedAt,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp: generatedAt }]
};

describe("sanctions screening service", () => {
  it("returns not configured by default instead of pretending sanctions data exists", async () => {
    const service = new SanctionsScreeningService(config(), () => new Date(generatedAt));

    const result = await service.screenVessel(vessel);

    expect(result).toMatchObject({
      status: "not_configured",
      mode: "off",
      provider: "opensanctions",
      subject: {
        vesselId: vessel.id,
        mmsi: vessel.mmsi,
        name: vessel.name
      },
      matches: [],
      summary: {
        matchCount: 0,
        reviewRequiredCount: 0
      }
    });
    expect(result.limitations[1]).toContain("false positives");
  });

  it("returns deterministic mock review leads only when mock mode is explicit", async () => {
    const service = new SanctionsScreeningService(
      config({ sanctionsContextMode: "mock", sanctionsContextMaxResults: 1 }),
      () => new Date(generatedAt)
    );

    const result = await service.screenVessel(vessel);

    expect(result.status).toBe("ok");
    expect(result.mode).toBe("mock");
    expect(result.provider).toBe("mock");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      reviewStatus: "possible_match",
      risk: "medium"
    });
    expect(result.limitations[1]).toContain("false positives");
  });

  it("returns not configured in live mode until an adapter is wired", async () => {
    const service = new SanctionsScreeningService(
      config({ sanctionsContextMode: "live", sanctionsContextProvider: "custom" }),
      () => new Date(generatedAt)
    );

    const result = await service.screenVessel(vessel);

    expect(result.status).toBe("not_configured");
    expect(result.mode).toBe("live");
    expect(result.provider).toBe("custom");
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
    flightRouteContextMode: "off",
    flightRouteContextProvider: "flightaware",
    flightRouteContextMaxWaypoints: 60,
    sanctionsContextMode: "off",
    sanctionsContextProvider: "opensanctions",
    sanctionsContextMaxResults: 10,
    satelliteContextMode: "live",
    satelliteContextProvider: "nasa-gibs",
    satelliteContextLayer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    satelliteContextDateOffsetDays: 1,
    satelliteContextImageSize: 512,
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

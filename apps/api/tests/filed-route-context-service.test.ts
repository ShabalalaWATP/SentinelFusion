import { describe, expect, it } from "vitest";
import type { Aircraft } from "@aisstream/shared";
import { FiledRouteContextService } from "../src/context/filed-route-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T12:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-407abc",
  icao24: "407abc",
  callsign: "RFR7182",
  classification: "military",
  emergency: false,
  latitude: 50.82,
  longitude: -1.21,
  lastUpdated: generatedAt,
  onGround: false,
  originAirport: "EGLL",
  destinationAirport: "EGJJ",
  originCountry: "United Kingdom",
  riskLevel: "medium",
  source: "mock",
  track: []
};

describe("filed route context service", () => {
  it("returns not configured by default instead of pretending filed route data exists", async () => {
    const service = new FiledRouteContextService(config(), () => new Date(generatedAt));

    const result = await service.getFiledRoute(aircraft);

    expect(result).toMatchObject({
      status: "not_configured",
      mode: "off",
      provider: "flightaware",
      aircraft: {
        aircraftId: aircraft.id,
        icao24: aircraft.icao24,
        callsign: aircraft.callsign
      }
    });
    expect(result.route).toBeUndefined();
    expect(result.limitations[0]).toContain("licensed FlightAware");
  });

  it("returns deterministic mock route data only when mock mode is explicit", async () => {
    const service = new FiledRouteContextService(
      config({ flightRouteContextMode: "mock", flightRouteContextMaxWaypoints: 2 }),
      () => new Date(generatedAt)
    );

    const result = await service.getFiledRoute(aircraft);

    expect(result.status).toBe("ok");
    expect(result.mode).toBe("mock");
    expect(result.provider).toBe("mock");
    expect(result.route?.originAirport).toBe("EGLL");
    expect(result.route?.destinationAirport).toBe("EGJJ");
    expect(result.route?.waypoints).toHaveLength(2);
    expect(result.limitations[0]).toContain("Mock filed routes");
  });

  it("returns not configured in live mode until a licensed adapter is wired", async () => {
    const service = new FiledRouteContextService(
      config({ flightRouteContextMode: "live", flightRouteContextProvider: "fr24" }),
      () => new Date(generatedAt)
    );

    const result = await service.getFiledRoute(aircraft);

    expect(result.status).toBe("not_configured");
    expect(result.mode).toBe("live");
    expect(result.provider).toBe("fr24");
    expect(result.source.url).toContain("fr24api");
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
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Aircraft } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IAircraftIntelService, IFlightRouteContextService } from "../src/domain/interfaces";

const config: AppConfig = {
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
  analysisMode: "mock",
  openaiModel: "gpt-5.4-mini",
  openaiTimeoutMs: 20000,
  rateLimitMax: 100,
  rateLimitWindow: "1 minute",
  logLevel: "error"
};

const timestamp = "2026-06-11T10:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  registration: "ZZ343",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: -1.75,
  latitude: 51.2,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  verticalRateFpm: 300,
  squawk: "7001",
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "mock",
  lastUpdated: timestamp,
  track: [{ longitude: -1.75, latitude: 51.2, altitudeFt: 18000, timestamp }]
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("aircraft routes", () => {
  it("returns seeded aircraft snapshots with secret-free flight status", async () => {
    app = await createApp(
      {
        ...config,
        flightApiKey: "test-flight-key"
      },
      {
        seedAircraft: [aircraft],
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "GET",
      url: "/aircraft",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      aircraft: [{ id: "icao24-43c6f1", classification: "military" }],
      metrics: {
        liveAircraft: 1,
        militaryAircraft: 1
      },
      stream: {
        mode: "mock",
        provider: "mock"
      }
    });
    expect(response.body).not.toContain("test-flight-key");
  });

  it("starts the mock aircraft stream with live aircraft", async () => {
    app = await createApp(config);

    const response = await app.inject({
      method: "GET",
      url: "/aircraft",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().aircraft.length).toBeGreaterThan(0);
    expect(response.json().metrics.militaryAircraft).toBeGreaterThan(0);
    expect(response.body).not.toContain("altitudeStepFt");
    expect(response.body).not.toContain("longitudeStep");
    expect(response.body).not.toContain("latitudeStep");
  });

  it("returns flight stream status without provider credentials", async () => {
    app = await createApp(
      {
        ...config,
        flightApiKey: "test-flight-key"
      },
      { startStreams: false }
    );

    const response = await app.inject({
      method: "GET",
      url: "/flight/status",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: "mock",
      provider: "mock",
      subscription: {
        boundingBoxes: [[[-90, -180], [90, 180]]]
      }
    });
    expect(response.body).not.toContain("test-flight-key");
  });

  it("protects aircraft intel requests when an analysis token is configured", async () => {
    app = await createApp(
      {
        ...config,
        analysisApiToken: "test-token"
      },
      {
        seedAircraft: [aircraft],
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "POST",
      url: `/aircraft/${aircraft.id}/intel`
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns aircraft intel for a selected aircraft", async () => {
    const intelService: IAircraftIntelService = {
      async enrich(target) {
        return {
          status: "ok",
          mode: "mock",
          model: "test",
          aircraftId: target.id,
          summary: "Aircraft web intel completed.",
          facts: [`ICAO ${target.icao24}.`],
          sources: [],
          limitations: ["Test service."],
          generatedAt: timestamp
        };
      }
    };
    app = await createApp(
      {
        ...config,
        analysisApiToken: "test-token"
      },
      {
        aircraftIntelService: intelService,
        seedAircraft: [aircraft],
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "POST",
      url: `/aircraft/${aircraft.id}/intel`,
      headers: { authorization: "Bearer test-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      aircraftId: aircraft.id,
      summary: "Aircraft web intel completed."
    });
  });

  it("resolves selected-aircraft filed route context from the server repository", async () => {
    const filedRouteContextService: IFlightRouteContextService = {
      async getFiledRoute(target) {
        return {
          status: "not_configured",
          mode: "off",
          provider: "flightaware",
          source: {
            title: "FlightAware AeroAPI",
            url: "https://www.flightaware.com/aeroapi/portal/documentation",
            attribution: "Licensed provider required"
          },
          generatedAt: timestamp,
          cached: false,
          aircraft: {
            aircraftId: target.id,
            icao24: target.icao24,
            callsign: target.callsign
          },
          limitations: ["Filed route provider is not configured."],
          error: "Licensed filed-route provider is not configured."
        };
      }
    };
    app = await createApp(config, {
      filedRouteContextService,
      seedAircraft: [aircraft],
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/filed-route`,
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "not_configured",
      aircraft: {
        aircraftId: aircraft.id,
        icao24: aircraft.icao24
      }
    });
  });
});

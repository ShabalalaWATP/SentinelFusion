import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Aircraft, AirportContextResponse } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IAirportContextService } from "../src/domain/interfaces";

const timestamp = "2026-06-21T11:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-407abc",
  icao24: "407abc",
  callsign: "RFR7182",
  classification: "military",
  emergency: false,
  latitude: 50.82,
  longitude: -1.21,
  lastUpdated: timestamp,
  onGround: false,
  originCountry: "United Kingdom",
  riskLevel: "medium",
  source: "mock",
  track: []
};
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

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("airport context routes", () => {
  it("returns airport context for valid area bounds", async () => {
    const airportContextService: IAirportContextService = {
      async getAreaAirports(bounds) {
        return context({ area: bounds });
      },
      async getNearbyAirports() {
        throw new Error("point service should not be called");
      }
    };
    app = await createApp(config, { airportContextService, startStreams: false });

    const response = await app.inject({
      method: "GET",
      url: "/context/airports?south=50.68&west=-1.28&north=50.9&east=-0.86",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      area: {
        south: 50.68,
        west: -1.28,
        north: 50.9,
        east: -0.86
      }
    });
  });

  it("returns airport context for valid point lookups", async () => {
    let capturedFocus: Parameters<IAirportContextService["getNearbyAirports"]>[0] | undefined;
    const airportContextService: IAirportContextService = {
      async getAreaAirports() {
        throw new Error("area service should not be called");
      },
      async getNearbyAirports(focus) {
        capturedFocus = focus;
        return context({
          focus: {
            latitude: focus.latitude,
            longitude: focus.longitude
          }
        });
      }
    };
    app = await createApp(config, { airportContextService, startStreams: false });

    const response = await app.inject({
      method: "GET",
      url: "/context/airports?latitude=50.82&longitude=-1.21&radiusKm=80",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedFocus).toMatchObject({ latitude: 50.82, longitude: -1.21, radiusKm: 80 });
  });

  it("resolves selected-aircraft airport context from server aircraft state", async () => {
    let capturedFocus: Parameters<IAirportContextService["getNearbyAirports"]>[0] | undefined;
    const airportContextService: IAirportContextService = {
      async getAreaAirports() {
        throw new Error("area service should not be called");
      },
      async getNearbyAirports(focus) {
        capturedFocus = focus;
        return context({ focus });
      }
    };
    app = await createApp(config, {
      airportContextService,
      seedAircraft: [aircraft],
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/airport-context?radiusKm=90`,
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedFocus).toMatchObject({
      latitude: aircraft.latitude,
      longitude: aircraft.longitude,
      aircraftId: aircraft.id,
      label: aircraft.callsign,
      radiusKm: 90
    });
  });

  it("rejects invalid or over-large area queries without calling the service", async () => {
    const airportContextService: IAirportContextService = {
      async getAreaAirports() {
        throw new Error("service should not be called");
      },
      async getNearbyAirports() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, { airportContextService, startStreams: false });

    const response = await app.inject({
      method: "GET",
      url: "/context/airports?south=-90&west=-180&north=90&east=180",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("too tall");
  });
});

function context(
  overrides: Partial<Pick<AirportContextResponse, "area" | "focus">> = {}
): AirportContextResponse {
  return {
    status: "ok",
    mode: "mock",
    source: {
      title: "OurAirports open airport data",
      url: "https://ourairports.com/data/",
      attribution: "Airport and runway open data by OurAirports"
    },
    generatedAt: timestamp,
    cached: false,
    airports: [],
    summary: {
      count: 0,
      scheduledServiceCount: 0,
      runwayCount: 0
    },
    limitations: ["Test service."],
    ...overrides
  };
}

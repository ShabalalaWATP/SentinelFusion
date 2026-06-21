import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IAirspaceContextService } from "../src/domain/interfaces";

const timestamp = "2026-06-21T12:00:00.000Z";
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

describe("airspace context route", () => {
  it("returns airspace context for valid area bounds", async () => {
    const airspaceContextService: IAirspaceContextService = {
      async getAreaAirspace(bounds) {
        return {
          status: "not_configured",
          mode: "off",
          source: {
            title: "Authorised NOTAM/TFR provider",
            url: "https://www.faa.gov/air_traffic/technology/swim",
            attribution: "Authorised provider required"
          },
          generatedAt: timestamp,
          cached: false,
          area: bounds,
          notices: [],
          summary: {
            count: 0,
            activeCount: 0,
            upcomingCount: 0,
            highSeverityCount: 0
          },
          limitations: ["Provider not configured."],
          error: "Authorised airspace notice provider is not configured."
        };
      }
    };
    app = await createApp(config, {
      airspaceContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/airspace?south=50.68&west=-1.28&north=50.9&east=-0.86",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "not_configured",
      area: {
        south: 50.68,
        west: -1.28,
        north: 50.9,
        east: -0.86
      }
    });
  });

  it("rejects invalid airspace bounds without calling the service", async () => {
    const airspaceContextService: IAirspaceContextService = {
      async getAreaAirspace() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      airspaceContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/airspace?south=51&west=-1&north=50&east=-1",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects over-large airspace bounds without calling the service", async () => {
    const airspaceContextService: IAirspaceContextService = {
      async getAreaAirspace() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      airspaceContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/airspace?south=-90&west=-180&north=90&east=180",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(413);
    expect(response.json().error).toContain("too tall");
  });
});

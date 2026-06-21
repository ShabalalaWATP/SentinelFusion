import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { ISatelliteContextService } from "../src/domain/interfaces";

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
  logLevel: "error"
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("satellite context route", () => {
  it("returns satellite context for valid area bounds", async () => {
    const satelliteContextService: ISatelliteContextService = {
      async getAreaSnapshot(bounds) {
        return {
          status: "ok",
          mode: "live",
          provider: "nasa-gibs",
          source: {
            title: "NASA GIBS imagery",
            url: "https://nasa-gibs.github.io/gibs-api-docs/",
            attribution: "Satellite imagery by NASA Global Imagery Browse Services"
          },
          generatedAt: timestamp,
          cached: false,
          area: bounds,
          snapshot: {
            id: "snapshot-1",
            title: "VIIRS SNPP corrected reflectance true colour",
            layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
            imageUrl: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
            acquiredDate: "2026-06-20",
            format: "image/jpeg",
            width: 512,
            height: 512,
            projection: "EPSG:4326",
            area: bounds
          },
          limitations: ["GIBS browse imagery is contextual."]
        };
      }
    };
    app = await createApp(config, {
      satelliteContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/satellite-snapshot?south=50.68&west=-1.28&north=50.9&east=-0.86",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      provider: "nasa-gibs",
      area: {
        south: 50.68,
        west: -1.28,
        north: 50.9,
        east: -0.86
      }
    });
  });

  it("returns a typed provider error for over-large satellite bounds", async () => {
    app = await createApp(config, {
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/satellite-snapshot?south=-90&west=-180&north=90&east=180",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "error",
      mode: "live",
      provider: "nasa-gibs",
      area: {
        south: -90,
        west: -180,
        north: 90,
        east: 180
      }
    });
    expect(response.json().error).toContain("too tall");
  });
});

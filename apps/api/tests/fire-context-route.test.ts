import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IFireContextService } from "../src/domain/interfaces";

const timestamp = "2026-06-21T10:00:00.000Z";
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

describe("fire context route", () => {
  it("returns fire context for valid area bounds", async () => {
    const fireContextService: IFireContextService = {
      async getAreaFires(bounds) {
        return {
          status: "ok",
          mode: "mock",
          source: {
            title: "NASA FIRMS Active Fire",
            url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
            attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
          },
          generatedAt: timestamp,
          cached: false,
          area: bounds,
          sourceDataset: "VIIRS_SNPP_NRT",
          dayRange: 1,
          detections: [],
          summary: {
            count: 0,
            highConfidenceCount: 0,
            dayCount: 0,
            nightCount: 0
          },
          risk: {
            level: "low",
            reasons: ["No active fire detections were returned for this area."]
          },
          limitations: ["Test service."]
        };
      }
    };
    app = await createApp(config, {
      fireContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/fire-anomalies?south=50.68&west=-1.28&north=50.9&east=-0.86",
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
      },
      sourceDataset: "VIIRS_SNPP_NRT"
    });
  });

  it("rejects invalid fire context bounds without calling the provider service", async () => {
    const fireContextService: IFireContextService = {
      async getAreaFires() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      fireContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/fire-anomalies?south=51&west=-1&north=50&east=-1",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects over-large fire context bounds without calling the provider service", async () => {
    const fireContextService: IFireContextService = {
      async getAreaFires() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      fireContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/fire-anomalies?south=-90&west=-180&north=90&east=180",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("too tall");
  });
});

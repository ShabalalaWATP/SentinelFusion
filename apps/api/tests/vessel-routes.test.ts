import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Vessel } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IVesselIntelService } from "../src/domain/interfaces";

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

const timestamp = "2026-06-11T10:00:00.000Z";
const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.3,
  latitude: 51.95,
  speedOverGround: 13.2,
  courseOverGround: 76,
  heading: 74,
  destination: "Felixstowe",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.3, latitude: 51.95, timestamp }]
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("vessel routes", () => {
  it("returns seeded vessel snapshots with stream metrics", async () => {
    app = await createApp(config, {
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/vessels",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      vessels: [{ id: vessel.id, mmsi: vessel.mmsi }],
      metrics: {
        liveVessels: 1,
        trackedVessels: 1
      },
      stream: {
        mode: "mock"
      }
    });
  });

  it("guards vessel intel when the analysis token is configured", async () => {
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        seedVessels: [vessel],
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "POST",
      url: `/vessels/${vessel.id}/intel`
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns vessel intel for a selected vessel", async () => {
    const intelService: IVesselIntelService = {
      async enrich(target) {
        return {
          status: "ok",
          mode: "mock",
          model: "test",
          vesselId: target.id,
          summary: "Vessel web intel completed.",
          facts: [`MMSI ${target.mmsi}.`],
          sources: [],
          limitations: ["Test service."],
          generatedAt: timestamp
        };
      }
    };
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        vesselIntelService: intelService,
        seedVessels: [vessel],
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "POST",
      url: `/vessels/${vessel.id}/intel`,
      headers: { authorization: "Bearer 0123456789abcdef" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      vesselId: vessel.id,
      summary: "Vessel web intel completed."
    });
  });
});

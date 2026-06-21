import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ConflictContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IConflictContextService } from "../src/domain/interfaces";

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
  airportContextMode: "mock",
  airportContextTimeoutMs: 10000,
  airportContextCacheSeconds: 86400,
  airportContextMaxResults: 8,
  airportContextMaxRunwaysPerAirport: 4,
  conflictContextMode: "mock",
  conflictContextProvider: "acled",
  conflictContextLookbackDays: 14,
  conflictContextTimeoutMs: 10000,
  conflictContextCacheSeconds: 900,
  conflictContextCacheMaxEntries: 200,
  conflictContextMaxResults: 50,
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

describe("conflict context route", () => {
  it("returns conflict context for valid area bounds", async () => {
    const conflictContextService: IConflictContextService = {
      async getAreaConflict(bounds) {
        return mockConflictResponse(bounds);
      }
    };
    app = await createApp(config, {
      conflictContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/conflict-events?south=50.68&west=-1.28&north=50.9&east=-0.86",
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

  it("rejects invalid conflict context bounds without calling the service", async () => {
    const conflictContextService: IConflictContextService = {
      async getAreaConflict() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      conflictContextService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/conflict-events?south=51&west=-1&north=50&east=-1",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
  });

  it("requires the analysis token before calling the conflict context service", async () => {
    const getAreaConflict = vi.fn(async () => {
      throw new Error("service should not be called");
    });
    const conflictContextService: IConflictContextService = {
      getAreaConflict
    };
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        conflictContextService,
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "GET",
      url: "/context/conflict-events?south=50.68&west=-1.28&north=50.9&east=-0.86"
    });

    expect(response.statusCode).toBe(401);
    expect(getAreaConflict).not.toHaveBeenCalled();
  });

  it("accepts a bearer analysis token for conflict context", async () => {
    const getAreaConflict = vi.fn(async (bounds) => mockConflictResponse(bounds));
    const conflictContextService: IConflictContextService = {
      getAreaConflict
    };
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        conflictContextService,
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "GET",
      url: "/context/conflict-events?south=50.68&west=-1.28&north=50.9&east=-0.86",
      headers: { authorization: "Bearer 0123456789abcdef" }
    });

    expect(response.statusCode).toBe(200);
    expect(getAreaConflict).toHaveBeenCalledOnce();
  });

  it("accepts an x-analysis-token header for conflict context", async () => {
    const getAreaConflict = vi.fn(async (bounds) => mockConflictResponse(bounds));
    const conflictContextService: IConflictContextService = {
      getAreaConflict
    };
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        conflictContextService,
        startStreams: false
      }
    );

    const response = await app.inject({
      method: "GET",
      url: "/context/conflict-events?south=50.68&west=-1.28&north=50.9&east=-0.86",
      headers: { "x-analysis-token": "0123456789abcdef" }
    });

    expect(response.statusCode).toBe(200);
    expect(getAreaConflict).toHaveBeenCalledOnce();
  });
});

function mockConflictResponse(bounds: TrafficAreaBounds): ConflictContextResponse {
  return {
    status: "ok",
    mode: "mock",
    provider: "mock",
    source: {
      title: "Mock conflict and protest events",
      url: "https://acleddata.com/api-documentation/acled-endpoint",
      attribution: "Mock conflict and protest context for tests"
    },
    generatedAt: timestamp,
    cached: false,
    area: bounds,
    lookbackDays: 14,
    events: [],
    summary: {
      count: 0,
      protestCount: 0,
      riotCount: 0,
      politicalViolenceCount: 0,
      fatalityCount: 0,
      highSeverityCount: 0
    },
    risk: {
      level: "low",
      reasons: ["No reported conflict or protest events were returned for this area."]
    },
    limitations: ["Test service."]
  };
}

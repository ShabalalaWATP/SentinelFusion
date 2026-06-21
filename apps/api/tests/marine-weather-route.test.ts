import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IMarineWeatherService } from "../src/domain/interfaces";

const timestamp = "2026-06-20T12:00:00.000Z";
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

describe("marine weather route", () => {
  it("returns marine weather context for valid area bounds", async () => {
    const marineWeatherService: IMarineWeatherService = {
      async getAreaWeather(bounds) {
        return {
          status: "ok",
          mode: "mock",
          source: {
            title: "Open-Meteo Marine Weather",
            url: "https://open-meteo.com/en/docs/marine-weather-api",
            attribution: "Weather data by Open-Meteo"
          },
          generatedAt: timestamp,
          cached: false,
          area: bounds,
          location: { latitude: 50.79, longitude: -1.07 },
          current: {
            time: timestamp,
            waveHeightM: 0.8
          },
          forecast: [],
          risk: {
            level: "low",
            reasons: ["Mock marine weather is below configured concern thresholds."]
          },
          limitations: ["Test service."]
        };
      }
    };
    app = await createApp(config, {
      marineWeatherService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/marine-weather?south=50.68&west=-1.28&north=50.9&east=-0.86",
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
      current: {
        waveHeightM: 0.8
      }
    });
  });

  it("rejects invalid marine weather bounds without calling the provider service", async () => {
    const marineWeatherService: IMarineWeatherService = {
      async getAreaWeather() {
        throw new Error("service should not be called");
      }
    };
    app = await createApp(config, {
      marineWeatherService,
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/context/marine-weather?south=51&west=-1&north=50&east=-1",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(400);
  });
});

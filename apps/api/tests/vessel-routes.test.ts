import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Vessel } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { ISanctionsScreeningService } from "../src/domain/interfaces";

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
  it("screens a selected vessel from server-side vessel state", async () => {
    let capturedVessel: Vessel | undefined;
    const sanctionsScreeningService = createSanctionsScreeningService((input) => {
      capturedVessel = input;
    });
    app = await createApp(config, {
      sanctionsScreeningService,
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "GET",
      url: `/vessels/${vessel.id}/sanctions-screening`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "not_configured",
      subject: {
        vesselId: vessel.id,
        mmsi: vessel.mmsi
      }
    });
    expect(capturedVessel?.name).toBe(vessel.name);
  });

  it("guards sanctions screening when the analysis token is configured", async () => {
    let invocations = 0;
    const sanctionsScreeningService = createSanctionsScreeningService(() => {
      invocations += 1;
    });
    app = await createApp(
      {
        ...config,
        analysisApiToken: "0123456789abcdef"
      },
      {
        sanctionsScreeningService,
        seedVessels: [vessel],
        startStreams: false
      }
    );

    const missingTokenResponse = await app.inject({
      method: "GET",
      url: `/vessels/${vessel.id}/sanctions-screening`
    });
    const wrongTokenResponse = await app.inject({
      method: "GET",
      url: `/vessels/${vessel.id}/sanctions-screening`,
      headers: { authorization: "Bearer wrong-token" }
    });
    const authorisedResponse = await app.inject({
      method: "GET",
      url: `/vessels/${vessel.id}/sanctions-screening`,
      headers: { "x-analysis-token": "0123456789abcdef" }
    });

    expect(missingTokenResponse.statusCode).toBe(401);
    expect(wrongTokenResponse.statusCode).toBe(401);
    expect(authorisedResponse.statusCode).toBe(200);
    expect(invocations).toBe(1);
  });
});

function createSanctionsScreeningService(onScreen?: (input: Vessel) => void): ISanctionsScreeningService {
  return {
    async screenVessel(input) {
      onScreen?.(input);
      return {
        status: "not_configured",
        mode: "off",
        provider: "opensanctions",
        source: {
          title: "OpenSanctions API",
          url: "https://www.opensanctions.org/docs/api/",
          attribution: "Configured provider required"
        },
        generatedAt: timestamp,
        cached: false,
        subject: {
          vesselId: input.id,
          mmsi: input.mmsi,
          name: input.name,
          shipType: input.shipType
        },
        matches: [],
        summary: {
          matchCount: 0,
          reviewRequiredCount: 0
        },
        limitations: ["Screening provider is not configured."],
        error: "Sanctions screening provider is not configured."
      };
    }
  };
}

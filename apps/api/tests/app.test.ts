import { randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Vessel } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { IVesselIntelService } from "../src/domain/interfaces";
import { isAllowedOrigin } from "../src/ws/origin";

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
  flightMode: "mock", flightProvider: "mock",
  flightBoundingBoxes: [[[-90, -180], [90, 180]]], flightPollIntervalMs: 5000,
  flightStaleAfterSeconds: 60, flightProviderTimeoutMs: 10000,
  marineWeatherMode: "mock", marineWeatherTimeoutMs: 10000,
  marineWeatherCacheSeconds: 900, marineWeatherCacheMaxEntries: 200,
  firmsMode: "mock", firmsSource: "VIIRS_SNPP_NRT", firmsDayRange: 1,
  firmsTimeoutMs: 10000, firmsCacheSeconds: 900, firmsCacheMaxEntries: 200,
  firmsMaxDetections: 150,
  airportContextMode: "mock", airportContextTimeoutMs: 10000,
  airportContextCacheSeconds: 86400, airportContextMaxResults: 8, airportContextMaxRunwaysPerAirport: 4,
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
describe("api app", () => {
  it("returns health status", async () => {
    app = await createApp(config, { startStreams: false });

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      mode: "mock"
    });
  });

  it("returns an empty vessel snapshot before the stream starts", async () => {
    app = await createApp(config, { startStreams: false });

    const response = await app.inject({
      method: "GET",
      url: "/vessels",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      vessels: [],
      metrics: {
        liveVessels: 0,
        trackedVessels: 0,
        highRiskVessels: 0
      }
    });
  });

  it("returns secret-free stream status", async () => {
    app = await createApp(
      {
        ...config,
        aisstreamApiKey: "test-secret-key"
      },
      { startStreams: false }
    );

    const response = await app.inject({
      method: "GET",
      url: "/stream/status",
      headers: { origin: "http://localhost:5173" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: "mock",
      state: "idle",
      subscription: {
        filterMessageTypes: ["PositionReport"]
      }
    });
    expect(response.body).not.toContain("test-secret-key");
    expect(response.body).not.toContain("APIKey");
  });

  it("validates analysis request bodies", async () => {
    app = await createApp(config, { startStreams: false });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "x" }
    });

    expect(response.statusCode).toBe(400);
  });

  it("runs mock analysis from server-side vessel state", async () => {
    app = await createApp(config, {
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: {
        question: "Assess this vessel",
        vesselId: vessel.id
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      mode: "mock",
      riskLevel: "low"
    });
    expect(response.body).toContain(vessel.mmsi);
  });

  it("enriches a selected vessel from server-side vessel state", async () => {
    let capturedVessel: Vessel | undefined;
    const vesselIntelService: IVesselIntelService = {
      async enrich(input) {
        capturedVessel = input;
        return {
          status: "ok",
          mode: "mock",
          model: "test",
          vesselId: input.id,
          summary: "Vessel intel completed.",
          facts: [`MMSI ${input.mmsi}.`],
          sources: [],
          limitations: ["Test service."],
          generatedAt: timestamp
        };
      }
    };
    app = await createApp(config, {
      vesselIntelService,
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: `/vessels/${vessel.id}/intel`,
      payload: {}
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      vesselId: vessel.id
    });
    expect(capturedVessel?.mmsi).toBe(vessel.mmsi);
  });

  it("returns 404 when vessel intel is requested for an unknown vessel", async () => {
    app = await createApp(config, {
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/vessels/mmsi-000000000/intel",
      payload: {}
    });

    expect(response.statusCode).toBe(404);
  });

  it("guards analysis when ANALYSIS_API_TOKEN is configured", async () => {
    const guardedConfig: AppConfig = {
      ...config,
      analysisApiToken: "0123456789abcdef"
    };
    app = await createApp(guardedConfig, {
      seedVessels: [vessel],
      startStreams: false
    });

    const blocked = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "Assess current traffic" }
    });
    expect(blocked.statusCode).toBe(401);

    const allowed = await app.inject({
      method: "POST",
      url: "/analysis",
      headers: { "x-analysis-token": "0123456789abcdef" },
      payload: { question: "Assess current traffic" }
    });
    expect(allowed.statusCode).toBe(200);
  });

  it("applies the global rate limit to analysis", async () => {
    app = await createApp(
      {
        ...config,
        rateLimitMax: 1
      },
      { startStreams: false }
    );

    const first = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "Assess current traffic" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "Assess current traffic" }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
  });

  it("does not let spoofed proxy headers bypass rate limits by default", async () => {
    app = await createApp(
      {
        ...config,
        rateLimitMax: 1
      },
      { startStreams: false }
    );

    const first = await app.inject({
      method: "POST",
      url: "/analysis",
      headers: { "x-forwarded-for": "203.0.113.10" },
      payload: { question: "Assess current traffic" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/analysis",
      headers: { "x-forwarded-for": "203.0.113.11" },
      payload: { question: "Assess current traffic" }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
  });

  it("rejects WebSocket origins outside the allow-list", () => {
    expect(isAllowedOrigin("https://example.invalid", config.corsOrigins)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5173", config.corsOrigins)).toBe(true);
  });

  it("rejects disallowed WebSocket origins at the upgrade boundary", async () => {
    app = await createApp(config, { startStreams: false });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address() as AddressInfo;

    await expect(
      probeWebSocketUpgrade(address.port, "http://localhost:5173")
    ).resolves.toBe("upgrade:101");
    await expect(
      probeWebSocketUpgrade(address.port, "https://example.invalid")
    ).resolves.toBe("response:403");
  });
});

function probeWebSocketUpgrade(port: number, origin: string): Promise<string> {
  return new Promise((resolve) => {
    const request = httpRequest({
      host: "127.0.0.1",
      port,
      path: "/ws/vessels",
      method: "GET",
      headers: {
        connection: "Upgrade",
        origin,
        "sec-websocket-key": randomBytes(16).toString("base64"),
        "sec-websocket-version": "13",
        upgrade: "websocket"
      },
      timeout: 2000
    });

    request.on("upgrade", (response, socket) => {
      socket.destroy();
      resolve(`upgrade:${response.statusCode}`);
    });
    request.on("response", (response) => {
      response.resume();
      resolve(`response:${response.statusCode}`);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve("timeout");
    });
    request.on("error", (error) => {
      resolve(`error:${error.message}`);
    });
    request.end();
  });
}

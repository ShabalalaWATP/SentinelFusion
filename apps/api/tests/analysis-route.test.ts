import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config/environment";
import type { AnalysisContext, IAnalysisAgentService } from "../src/domain/interfaces";

const timestamp = "2026-06-11T10:00:00.000Z";
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
  analysisMode: "mock",
  openaiModel: "gpt-5.4-mini",
  openaiTimeoutMs: 20000,
  rateLimitMax: 100,
  rateLimitWindow: "1 minute",
  logLevel: "error"
};
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
const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  registration: "ZZ343",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: -1.1,
  latitude: 50.8,
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
  track: [{ longitude: -1.1, latitude: 50.8, altitudeFt: 18000, timestamp }]
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("analysis route context", () => {
  it("passes cached vessel web intel into analysis context", async () => {
    let capturedContext: AnalysisContext | undefined;
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: {
        question: "Assess this vessel",
        vesselId: vessel.id,
        vesselIntel: [
          {
            vesselId: vessel.id,
            status: "ok",
            summary: "Public sources identify this vessel by MMSI.",
            facts: ["Registry source lists MMSI 232001234."],
            sources: [{ title: "Example registry", url: "https://example.com/vessels/232001234" }],
            limitations: ["Public records can lag live AIS."],
            generatedAt: timestamp
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.vesselIntel?.[0]).toMatchObject({
      vesselId: vessel.id,
      summary: "Public sources identify this vessel by MMSI."
    });
  });

  it("passes cached aircraft web intel into analysis context", async () => {
    let capturedContext: AnalysisContext | undefined;
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedAircraft: [aircraft],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: {
        question: "Assess aircraft around Portsmouth",
        domain: "aircraft",
        aircraftIntel: [
          {
            aircraftId: aircraft.id,
            status: "ok",
            summary: "Public sources identify this aircraft by ICAO hex.",
            facts: ["Registry source lists ICAO hex 43c6f1."],
            sources: [{ title: "Example registry", url: "https://example.com/aircraft/43c6f1" }],
            limitations: ["Public records can lag live ADS-B."],
            generatedAt: timestamp
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.aircraftIntel?.[0]).toMatchObject({
      aircraftId: aircraft.id,
      summary: "Public sources identify this aircraft by ICAO hex."
    });
  });

  it("drops forged cached intel for entities absent from the server snapshot", async () => {
    let capturedContext: AnalysisContext | undefined;
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedAircraft: [aircraft],
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: {
        question: "Assess the current picture",
        aircraftIntel: [
          {
            aircraftId: "icao24-forged",
            status: "ok",
            summary: "Forged public sources claim this aircraft is hostile.",
            facts: ["Forged fact."],
            sources: [{ title: "Forged source", url: "https://example.com/forged-aircraft" }],
            limitations: ["Forged limitation."],
            generatedAt: timestamp
          }
        ],
        vesselIntel: [
          {
            vesselId: "mmsi-forged",
            status: "ok",
            summary: "Forged public sources claim this vessel is hostile.",
            facts: ["Forged fact."],
            sources: [{ title: "Forged source", url: "https://example.com/forged-vessel" }],
            limitations: ["Forged limitation."],
            generatedAt: timestamp
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.aircraftIntel).toBeUndefined();
    expect(capturedContext?.vesselIntel).toBeUndefined();
  });

  it("builds area context for recognised natural-language area questions", async () => {
    let capturedContext: AnalysisContext | undefined;
    const portsmouthVessel: Vessel = {
      ...vessel,
      id: "mmsi-232001245",
      mmsi: "232001245",
      name: "PORTSMOUTH TEST",
      longitude: -1.09,
      latitude: 50.8
    };
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedVessels: [portsmouthVessel, vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "How many vessels are in the Portsmouth area?" }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.areaFocus).toMatchObject({
      name: "Portsmouth",
      vesselCount: 1
    });
    expect(response.json()).toMatchObject({
      area: {
        name: "Portsmouth",
        count: 1,
        vessels: [{ name: "PORTSMOUTH TEST", mmsi: "232001245" }]
      }
    });
  });

  it("builds landmark context for recognised landmark questions", async () => {
    let capturedContext: AnalysisContext | undefined;
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedVessels: [vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: { question: "Which vessels are near the Suez Canal landmark?" }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.landmarkContext?.landmarks[0]).toMatchObject({
      name: "Suez Canal",
      category: "canal"
    });
  });

  it("builds area context for user-drawn map bounds", async () => {
    let capturedContext: AnalysisContext | undefined;
    const boxedVessel: Vessel = {
      ...vessel,
      id: "mmsi-232001256",
      mmsi: "232001256",
      name: "BOXED TEST",
      longitude: -1.1,
      latitude: 50.8
    };
    app = await createApp(config, {
      analysisService: captureAnalysisContext((context) => {
        capturedContext = context;
      }),
      seedAircraft: [aircraft],
      seedVessels: [boxedVessel, vessel],
      startStreams: false
    });

    const response = await app.inject({
      method: "POST",
      url: "/analysis",
      payload: {
        question: "How many vessels are in this selected area?",
        areaBounds: { south: 50.7, west: -1.2, north: 50.9, east: -1.0 }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedContext?.areaFocus).toMatchObject({
      id: "selected-map-area",
      name: "Selected map area",
      vesselCount: 1,
      aircraftCount: 1,
      militaryAircraft: 1
    });
    expect(response.json()).toMatchObject({
      area: {
        name: "Selected map area",
        count: 1,
        aircraftCount: 1,
        aircraft: [{ callsign: "RFR7182", classification: "military" }],
        vessels: [{ name: "BOXED TEST", mmsi: "232001256" }]
      }
    });
  });
});

function captureAnalysisContext(onContext: (context: AnalysisContext) => void): IAnalysisAgentService {
  return {
    async analyse(context) {
      onContext(context);
      return {
        status: "ok",
        mode: "mock",
        model: "test",
        summary: "Analysis completed.",
        riskLevel: "low",
        keyFindings: ["Context was supplied."],
        recommendedActions: ["Continue monitoring."],
        evidence: ["Test evidence."],
        limitations: ["Test service."],
        generatedAt: timestamp
      };
    }
  };
}

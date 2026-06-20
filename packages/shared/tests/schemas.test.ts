import { describe, expect, it } from "vitest";
import {
  aircraftMetricsSchema,
  aircraftSchema,
  aircraftStreamEnvelopeSchema,
  aisStreamStatusSchema,
  analysisRequestSchema,
  analysisSummarySchema,
  vesselMetricsSchema,
  vesselSchema,
  vesselStreamEnvelopeSchema
} from "../src";

const now = new Date("2026-06-11T10:00:00.000Z").toISOString();

describe("shared schemas", () => {
  it("validates a normalised vessel", () => {
    const parsed = vesselSchema.parse({
      id: "mmsi-232001234",
      mmsi: "232001234",
      name: "NORTHERN LIGHT",
      shipType: "Cargo",
      longitude: 1.24,
      latitude: 51.88,
      speedOverGround: 12.5,
      courseOverGround: 92,
      destination: "Felixstowe",
      navigationalStatus: "Under way using engine",
      riskLevel: "low",
      lastUpdated: now,
      track: [{ longitude: 1.2, latitude: 51.8, timestamp: now }]
    });

    expect(parsed.mmsi).toBe("232001234");
  });

  it("rejects invalid MMSI values", () => {
    expect(() =>
      vesselSchema.parse({
        id: "bad",
        mmsi: "123",
        name: "Bad MMSI",
        shipType: "Cargo",
        longitude: 0,
        latitude: 0,
        speedOverGround: 1,
        courseOverGround: 1,
        navigationalStatus: "Under way",
        riskLevel: "low",
        lastUpdated: now,
        track: []
      })
    ).toThrow();
  });

  it("validates WebSocket update envelopes", () => {
    const metrics = vesselMetricsSchema.parse({
      liveVessels: 1,
      trackedVessels: 1,
      highRiskVessels: 0,
      averageSpeed: 12.5,
      dataLatencyMs: 250,
      lastUpdated: now
    });

    const parsed = vesselStreamEnvelopeSchema.parse({
      kind: "metrics",
      metrics,
      sentAt: now
    });

    expect(parsed.kind).toBe("metrics");
  });

  it("validates batched WebSocket vessel envelopes", () => {
    const metrics = vesselMetricsSchema.parse({
      liveVessels: 1,
      trackedVessels: 1,
      highRiskVessels: 0,
      averageSpeed: 12.5,
      dataLatencyMs: 250,
      lastUpdated: now
    });

    const parsed = vesselStreamEnvelopeSchema.parse({
      kind: "batch",
      vessels: [
        {
          id: "mmsi-232001234",
          mmsi: "232001234",
          name: "NORTHERN LIGHT",
          shipType: "Cargo",
          longitude: 1.24,
          latitude: 51.88,
          speedOverGround: 12.5,
          courseOverGround: 92,
          navigationalStatus: "Under way",
          riskLevel: "low",
          lastUpdated: now,
          track: []
        }
      ],
      metrics,
      sentAt: now
    });

    expect(parsed.kind).toBe("batch");
    expect(parsed.vessels).toHaveLength(1);
  });

  it("validates a normalised aircraft", () => {
    const parsed = aircraftSchema.parse({
      id: "icao24-40621b",
      icao24: "40621b",
      callsign: "BAW12",
      registration: "G-STBA",
      aircraftType: "Boeing 777-300ER",
      operator: "British Airways",
      originCountry: "United Kingdom",
      originAirport: "EGLL",
      destinationAirport: "KJFK",
      longitude: -1.24,
      latitude: 51.88,
      altitudeFt: 36000,
      geoAltitudeFt: 36500,
      groundSpeedKt: 452,
      trackDegrees: 276,
      verticalRateFpm: 0,
      squawk: "4451",
      emergency: false,
      onGround: false,
      category: "Heavy",
      classification: "commercial",
      riskLevel: "low",
      source: "mock",
      lastUpdated: now,
      track: [{ longitude: -1.3, latitude: 51.8, altitudeFt: 35000, timestamp: now }]
    });

    expect(parsed.icao24).toBe("40621b");
    expect(parsed.altitudeFt).toBe(36000);
  });

  it("rejects invalid aircraft coordinates and transponder ids", () => {
    expect(() =>
      aircraftSchema.parse({
        id: "icao24-bad",
        icao24: "not-hex",
        longitude: 200,
        latitude: 95,
        emergency: false,
        onGround: false,
        classification: "unknown",
        riskLevel: "low",
        source: "mock",
        lastUpdated: now,
        track: []
      })
    ).toThrow();
  });

  it("validates batched aircraft WebSocket envelopes", () => {
    const metrics = aircraftMetricsSchema.parse({
      liveAircraft: 1,
      trackedAircraft: 1,
      militaryAircraft: 0,
      emergencyAircraft: 0,
      averageAltitudeFt: 36000,
      averageGroundSpeedKt: 452,
      dataLatencyMs: 250,
      lastUpdated: now
    });

    const parsed = aircraftStreamEnvelopeSchema.parse({
      kind: "batch",
      aircraft: [
        {
          id: "icao24-40621b",
          icao24: "40621b",
          callsign: "BAW12",
          longitude: -1.24,
          latitude: 51.88,
          altitudeFt: 36000,
          groundSpeedKt: 452,
          emergency: false,
          onGround: false,
          classification: "commercial",
          riskLevel: "low",
          source: "mock",
          lastUpdated: now,
          track: []
        }
      ],
      metrics,
      sentAt: now
    });

    expect(parsed.kind).toBe("batch");
    expect(parsed.aircraft).toHaveLength(1);
  });

  it("validates stream status without exposing credentials", () => {
    const parsed = aisStreamStatusSchema.parse({
      mode: "live",
      state: "subscribed",
      connected: true,
      messagesReceived: 10,
      messagesNormalised: 9,
      messagesDropped: 1,
      errors: 0,
      reconnectAttempts: 0,
      lastMessageAt: now,
      dataLatencyMs: 50,
      subscription: {
        endpoint: "wss://stream.aisstream.io/v0/stream",
        boundingBoxes: [[[50, -2], [52, 2]]],
        filtersShipMMSI: ["232001234"],
        filterMessageTypes: ["PositionReport"]
      }
    });

    expect(JSON.stringify(parsed)).not.toContain("APIKey");
  });

  it("validates analysis request and response contracts", () => {
    const request = analysisRequestSchema.parse({
      question: "What is unusual about this traffic picture?",
      vesselId: "mmsi-232001234",
      areaBounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      vesselIntel: [
        {
          vesselId: "mmsi-232001234",
          status: "ok",
          profile: {
            matchedName: "NORTHERN LIGHT",
            classification: "commercial",
            confidence: "high"
          },
          summary: "Public sources identify a vessel with matching MMSI details.",
          facts: ["MMSI 232001234 appears in a public vessel registry."],
          sources: [
            {
              title: "Example registry",
              url: "https://example.com/vessels/232001234"
            }
          ],
          limitations: ["Public records may lag current AIS telemetry."],
          generatedAt: now
        }
      ]
    });

    const response = analysisSummarySchema.parse({
      status: "ok",
      mode: "mock",
      summary: "Traffic picture is stable with one elevated-risk vessel.",
      riskLevel: "medium",
      keyFindings: ["One vessel is marked medium risk."],
      recommendedActions: ["Monitor course and speed changes."],
      evidence: ["Tracked vessels: 1"],
      limitations: ["Synthetic analysis was used."],
      area: {
        id: "portsmouth",
        name: "Portsmouth",
        bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
        count: 1,
        listedCount: 1,
        highRiskCount: 0,
        militaryCount: 0,
        averageSpeedKn: 12.5,
        vessels: [
          {
            id: "mmsi-232001234",
            mmsi: "232001234",
            name: "NORTHERN LIGHT",
            shipType: "Cargo",
            longitude: -1.09,
            latitude: 50.8,
            speedOverGround: 12.5,
            courseOverGround: 92,
            riskLevel: "low",
            classification: "civilian"
          }
        ]
      },
      generatedAt: now
    });

    expect(request.vesselId).toBe("mmsi-232001234");
    expect(request.areaBounds?.north).toBe(50.9);
    expect(request.vesselIntel?.[0]?.profile?.confidence).toBe("high");
    expect(response.area?.vessels[0]?.name).toBe("NORTHERN LIGHT");
    expect(response.keyFindings).toHaveLength(1);
  });

});

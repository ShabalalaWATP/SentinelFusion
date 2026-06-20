import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { detectAnomalies } from "./anomalyDetection";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-111000111",
  mmsi: "111000111",
  name: "WATCHED WARSHIP",
  shipType: "AIS type 35",
  longitude: 56.2,
  latitude: 26.4,
  speedOverGround: 0.2,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "high",
  lastUpdated: timestamp,
  track: [
    { longitude: 56.2, latitude: 26.4, timestamp },
    { longitude: 56.21, latitude: 26.4, timestamp }
  ]
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR123",
  longitude: 56.1,
  latitude: 26.3,
  groundSpeedKt: 570,
  emergency: true,
  onGround: false,
  classification: "military",
  riskLevel: "high",
  source: "mock",
  lastUpdated: timestamp,
  track: []
};

describe("detectAnomalies", () => {
  it("detects entity and area anomalies for monitored traffic", () => {
    const anomalies = detectAnomalies({
      aircraft: [aircraft],
      vessels: [vessel],
      entityMonitors: [{ id: vessel.id, domain: "vessel", active: true, createdAt: timestamp }],
      areaMonitors: [
        {
          id: "hormuz",
          name: "Strait of Hormuz",
          active: true,
          createdAt: timestamp,
          bounds: { south: 25.35, west: 55.05, north: 27.25, east: 57.35 }
        }
      ]
    });

    expect(anomalies.some((item) => item.title === "Monitored vessel risk")).toBe(true);
    expect(anomalies.some((item) => item.title === "Stopped vessel in watched area")).toBe(true);
    expect(anomalies.some((item) => item.title === "Emergency aircraft in watched area")).toBe(true);
  });
});

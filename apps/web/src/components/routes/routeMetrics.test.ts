import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { formatDistanceNm, formatElapsedMinutes, getRouteMetrics } from "./routeMetrics";

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: "2026-06-11T10:30:00.000Z",
  track: [
    { longitude: 1.2, latitude: 51.7, timestamp: "2026-06-11T10:00:00.000Z" },
    { longitude: 1.3, latitude: 51.8, timestamp: "2026-06-11T10:30:00.000Z" }
  ]
};

describe("routeMetrics", () => {
  it("derives distance and elapsed time from AIS track points", () => {
    const metrics = getRouteMetrics(vessel);

    expect(metrics?.pointCount).toBe(2);
    expect(metrics?.elapsedMinutes).toBe(30);
    expect(metrics?.distanceNm).toBeGreaterThan(0);
    expect(formatDistanceNm(metrics?.distanceNm ?? 0)).toContain("nm");
    expect(formatElapsedMinutes(metrics?.elapsedMinutes ?? 0)).toBe("30 min");
  });
});

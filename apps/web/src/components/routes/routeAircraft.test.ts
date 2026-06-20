import { describe, expect, it } from "vitest";
import type { Aircraft } from "@aisstream/shared";
import { selectRouteAircraft } from "./routeAircraft";

const timestamp = "2026-06-11T10:00:00.000Z";

const baseAircraft: Aircraft = {
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW12",
  aircraftType: "Airbus A320",
  operator: "British Airways",
  originCountry: "United Kingdom",
  longitude: -1.1,
  latitude: 50.95,
  altitudeFt: 34000,
  groundSpeedKt: 320,
  trackDegrees: 282,
  emergency: false,
  onGround: false,
  classification: "commercial",
  riskLevel: "low",
  source: "mock",
  lastUpdated: timestamp,
  track: [{ longitude: -1.1, latitude: 50.95, altitudeFt: 34000, timestamp }]
};

describe("selectRouteAircraft", () => {
  it("returns only aircraft with visible track lines, ordered by speed", () => {
    const slowRoute = {
      ...baseAircraft,
      id: "icao24-slow01",
      icao24: "slow01",
      callsign: "SLOW1",
      groundSpeedKt: 250,
      track: [
        { longitude: -1.1, latitude: 50.95, altitudeFt: 34000, timestamp },
        { longitude: -1, latitude: 50.9, altitudeFt: 34000, timestamp }
      ]
    };
    const fastRoute = {
      ...slowRoute,
      id: "icao24-fast01",
      icao24: "fast01",
      callsign: "FAST1",
      groundSpeedKt: 420
    };

    expect(
      selectRouteAircraft([baseAircraft, slowRoute, fastRoute]).map((item) => item.callsign)
    ).toEqual(["FAST1", "SLOW1"]);
  });

  it("keeps a selected routed aircraft even when it falls outside the route cap", () => {
    const slowRoute = {
      ...baseAircraft,
      id: "icao24-slow01",
      icao24: "slow01",
      callsign: "SLOW1",
      groundSpeedKt: 250,
      track: [
        { longitude: -1.1, latitude: 50.95, altitudeFt: 34000, timestamp },
        { longitude: -1, latitude: 50.9, altitudeFt: 34000, timestamp }
      ]
    };
    const fastRoute = {
      ...slowRoute,
      id: "icao24-fast01",
      icao24: "fast01",
      callsign: "FAST1",
      groundSpeedKt: 420
    };

    expect(
      selectRouteAircraft([slowRoute, fastRoute], {
        limit: 1,
        selectedAircraftId: slowRoute.id
      }).map((item) => item.callsign)
    ).toEqual(["FAST1", "SLOW1"]);
  });
});

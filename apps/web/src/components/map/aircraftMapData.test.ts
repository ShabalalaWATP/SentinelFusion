import { describe, expect, it } from "vitest";
import type { Aircraft } from "@aisstream/shared";
import {
  toAircraftPointCollection,
  toAircraftTrackCollection,
  toAircraftTrackMarkerCollection
} from "./aircraftMapData";

const timestamp = "2026-06-11T10:00:00.000Z";

const aircraft: Aircraft = {
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW12",
  registration: "G-STBA",
  aircraftType: "Boeing 777-300ER",
  operator: "British Airways",
  originCountry: "United Kingdom",
  originAirport: "EGLL",
  destinationAirport: "KJFK",
  longitude: -1.1,
  latitude: 50.95,
  altitudeFt: 34000,
  groundSpeedKt: 452,
  trackDegrees: 282,
  verticalRateFpm: 0,
  squawk: "4451",
  emergency: false,
  onGround: false,
  category: "Heavy",
  classification: "commercial",
  riskLevel: "low",
  source: "mock",
  lastUpdated: timestamp,
  track: [
    {
      longitude: -1.1,
      latitude: 50.95,
      altitudeFt: 34000,
      timestamp: "2026-06-11T10:05:00.000Z"
    },
    { longitude: -1.05, latitude: 50.94, altitudeFt: 34000, timestamp }
  ]
};

describe("aircraftMapData", () => {
  it("converts aircraft into selected point features", () => {
    const collection = toAircraftPointCollection([aircraft], aircraft.id, new Set([aircraft.id]));

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.geometry.coordinates).toEqual([-1.1, 50.95]);
    expect(collection.features[0]?.properties).toMatchObject({
      id: aircraft.id,
      classification: "commercial",
      selected: 1,
      watched: 1
    });
  });

  it("converts aircraft tracks into line features", () => {
    const collection = toAircraftTrackCollection([aircraft], null, { includeAll: true });

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.geometry.coordinates).toEqual([
      [-1.05, 50.94],
      [-1.1, 50.95]
    ]);
    expect(collection.features[0]?.properties).toMatchObject({
      id: aircraft.id,
      selected: 0
    });
  });

  it("omits unselected aircraft tracks when route overview is disabled", () => {
    const collection = toAircraftTrackCollection([aircraft], null, { includeAll: false });

    expect(collection.features).toHaveLength(0);
  });

  it("creates start and latest flight-track markers from sorted points", () => {
    const collection = toAircraftTrackMarkerCollection([aircraft], aircraft.id, {
      includeAll: true
    });

    expect(collection.features).toHaveLength(2);
    expect(collection.features.map((feature) => feature.properties?.marker)).toEqual([
      "start",
      "latest"
    ]);
    expect(collection.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [-1.05, 50.94],
      [-1.1, 50.95]
    ]);
    expect(collection.features.every((feature) => feature.properties?.selected === 1)).toBe(true);
  });

  it("caps overview flight tracks while keeping the selected aircraft visible", () => {
    const aircraftRoutes = Array.from({ length: 42 }, (_, index) =>
      makeTrackedAircraft(index)
    );
    const selectedAircraft = aircraftRoutes[41]!;
    const collection = toAircraftTrackCollection(aircraftRoutes, selectedAircraft.id, {
      includeAll: true
    });

    expect(collection.features).toHaveLength(41);
    expect(collection.features.some((feature) => feature.properties?.id === "icao24-39")).toBe(
      true
    );
    expect(collection.features.some((feature) => feature.properties?.id === "icao24-40")).toBe(
      false
    );
    expect(collection.features.some((feature) => feature.properties?.id === selectedAircraft.id)).toBe(
      true
    );
  });
});

function makeTrackedAircraft(index: number): Aircraft {
  const id = `icao24-${index.toString().padStart(2, "0")}`;

  return {
    ...aircraft,
    id,
    icao24: index.toString(16).padStart(6, "0"),
    callsign: `FLT${index.toString().padStart(2, "0")}`,
    groundSpeedKt: 1_000 - index,
    track: [
      { longitude: -1.05, latitude: 50.94, altitudeFt: 34000, timestamp },
      {
        longitude: -1.1,
        latitude: 50.95,
        altitudeFt: 34000,
        timestamp: "2026-06-11T10:05:00.000Z"
      }
    ]
  };
}

import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { toPointCollection, toRouteMarkerCollection, toRouteTrackCollection } from "./vesselMapData";

const timestamp = "2026-06-11T10:00:00.000Z";

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
  lastUpdated: timestamp,
  track: [
    { longitude: 1.3, latitude: 51.8, timestamp: "2026-06-11T10:05:00.000Z" },
    { longitude: 1.2, latitude: 51.7, timestamp }
  ]
};

describe("vessel map data", () => {
  it("marks selected vessel points and route tracks", () => {
    const points = toPointCollection([vessel], vessel.id, new Set([vessel.id]));
    const tracks = toRouteTrackCollection([vessel], vessel.id, { includeAll: false });

    expect(points.features[0]?.properties?.selected).toBe(1);
    expect(points.features[0]?.properties?.watched).toBe(1);
    expect(tracks.features[0]?.properties?.selected).toBe(1);
    expect(tracks.features[0]?.geometry.coordinates).toEqual([
      [1.2, 51.7],
      [1.3, 51.8]
    ]);
  });

  it("omits unselected route tracks when route overview is disabled", () => {
    const tracks = toRouteTrackCollection([vessel], null, { includeAll: false });

    expect(tracks.features).toHaveLength(0);
  });

  it("creates start and latest route markers from sorted track points", () => {
    const markers = toRouteMarkerCollection([vessel], vessel.id, { includeAll: true });

    expect(markers.features).toHaveLength(2);
    expect(markers.features.map((feature) => feature.properties?.marker)).toEqual([
      "start",
      "latest"
    ]);
    expect(markers.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [1.2, 51.7],
      [1.3, 51.8]
    ]);
    expect(markers.features.every((feature) => feature.properties?.selected === 1)).toBe(true);
  });
});

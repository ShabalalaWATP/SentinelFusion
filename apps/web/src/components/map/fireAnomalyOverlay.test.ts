import { describe, expect, it } from "vitest";
import type { FireContextResponse } from "@aisstream/shared";
import { toFireAnomalyCollection } from "./fireAnomalyOverlay";

const fireContext: FireContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "NASA FIRMS Active Fire",
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
  },
  generatedAt: "2026-06-21T10:00:00.000Z",
  cached: false,
  area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
  sourceDataset: "VIIRS_SNPP_NRT",
  dayRange: 1,
  detections: [
    {
      id: "det-1",
      latitude: 50.79,
      longitude: -1.04,
      acquiredAt: "2026-06-21T09:30:00.000Z",
      confidence: "high",
      dayNight: "day",
      fireRadiativePowerMw: 55.1
    }
  ],
  summary: {
    count: 1,
    highConfidenceCount: 1,
    dayCount: 1,
    nightCount: 0
  },
  risk: {
    level: "high",
    reasons: ["One active fire detection may affect area operations."]
  },
  limitations: ["FIRMS active-fire points are satellite thermal detections."]
};

describe("fire anomaly overlay data", () => {
  it("converts FIRMS detections into a GeoJSON point collection", () => {
    const collection = toFireAnomalyCollection(fireContext);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [-1.04, 50.79]
      },
      properties: {
        id: "det-1",
        confidence: "high",
        frp: 55.1,
        label: "High fire"
      }
    });
  });

  it("does not map provider error states as live fire points", () => {
    const collection = toFireAnomalyCollection({
      ...fireContext,
      status: "error",
      detections: []
    });

    expect(collection.features).toHaveLength(0);
  });
});

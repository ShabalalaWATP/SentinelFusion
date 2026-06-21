import { describe, expect, it } from "vitest";
import type { ConflictContextResponse } from "@aisstream/shared";
import { toConflictContextCollection } from "./conflictContextOverlay";

const conflictContext: ConflictContextResponse = {
  status: "ok",
  mode: "live",
  provider: "acled",
  source: {
    title: "ACLED conflict and protest events",
    url: "https://acleddata.com/api-documentation/acled-endpoint",
    attribution: "Conflict and protest data by ACLED"
  },
  generatedAt: "2026-06-21T10:00:00.000Z",
  cached: false,
  area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
  lookbackDays: 14,
  events: [
    {
      id: "GBR12345",
      eventDate: "2026-06-20",
      eventType: "Protests",
      subEventType: "Peaceful protest",
      location: "Portsmouth",
      latitude: 50.8058,
      longitude: -1.0872,
      geocodingConfidence: "high",
      fatalities: 0,
      severity: "medium"
    }
  ],
  summary: {
    count: 1,
    protestCount: 1,
    riotCount: 0,
    politicalViolenceCount: 0,
    fatalityCount: 0,
    highSeverityCount: 0
  },
  risk: {
    level: "medium",
    reasons: ["One recent event."]
  },
  limitations: ["Conflict and protest events are based on reported sources."]
};

describe("conflict context overlay data", () => {
  it("converts conflict events into a GeoJSON point collection", () => {
    const collection = toConflictContextCollection(conflictContext);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [-1.0872, 50.8058]
      },
      properties: {
        id: "GBR12345",
        eventType: "Protests",
        label: "Protest",
        severity: "medium"
      }
    });
  });

  it("does not map provider error states as live conflict points", () => {
    const collection = toConflictContextCollection({
      ...conflictContext,
      status: "error",
      events: []
    });

    expect(collection.features).toHaveLength(0);
  });
});

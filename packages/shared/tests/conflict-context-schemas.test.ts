import { describe, expect, it } from "vitest";
import { conflictContextResponseSchema } from "../src";

const now = new Date("2026-06-20T12:00:00.000Z").toISOString();

describe("conflict context schemas", () => {
  it("validates conflict and protest context responses", () => {
    const parsed = conflictContextResponseSchema.parse({
      status: "ok",
      mode: "live",
      provider: "acled",
      source: {
        title: "ACLED conflict and protest events",
        url: "https://acleddata.com/api-documentation/acled-endpoint",
        attribution: "Conflict and protest data by ACLED"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      lookbackDays: 14,
      events: [
        {
          id: "GBR12345",
          eventDate: "2026-06-20",
          eventType: "Protests",
          subEventType: "Peaceful protest",
          disorderType: "Demonstrations",
          country: "United Kingdom",
          adminArea: "Portsmouth",
          location: "Portsmouth",
          latitude: 50.8058,
          longitude: -1.0872,
          geoPrecision: 1,
          geocodingConfidence: "high",
          fatalities: 0,
          severity: "medium",
          sourceName: "Local media",
          sourceScale: "Local",
          notes: "Reported demonstration near the port area."
        }
      ],
      summary: {
        count: 1,
        protestCount: 1,
        riotCount: 0,
        politicalViolenceCount: 0,
        fatalityCount: 0,
        highSeverityCount: 0,
        latestEventDate: "2026-06-20"
      },
      risk: {
        level: "medium",
        reasons: ["Recent demonstrations were reported inside this area."]
      },
      limitations: ["Conflict event data is based on reported sources and can lag reality."]
    });

    expect(parsed.events[0]?.geocodingConfidence).toBe("high");
    expect(parsed.summary.protestCount).toBe(1);
  });
});

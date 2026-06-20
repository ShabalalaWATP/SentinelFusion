import { describe, expect, it } from "vitest";
import { aircraftIntelResponseSchema, vesselIntelResponseSchema } from "../src";

const now = new Date("2026-06-11T10:00:00.000Z").toISOString();

describe("intel schemas", () => {
  it("validates vessel web intel responses with optional images", () => {
    const parsed = vesselIntelResponseSchema.parse({
      status: "ok",
      mode: "live",
      model: "gpt-5.4-mini",
      vesselId: "mmsi-232001234",
      profile: {
        matchedName: "NORTHERN LIGHT",
        imo: "1234567",
        mmsi: "232001234",
        flag: "United Kingdom",
        vesselType: "Cargo",
        militaryClass: "Type 45 destroyer",
        classification: "commercial",
        operator: "Example Maritime",
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
      image: {
        imageUrl: "https://example.com/images/vessel.jpg",
        thumbnailUrl: "https://example.com/images/vessel-thumb.jpg",
        sourceUrl: "https://example.com/vessels/232001234",
        caption: "Vessel profile image"
      },
      images: [
        {
          imageUrl: "https://example.com/images/vessel.jpg",
          thumbnailUrl: "https://example.com/images/vessel-thumb.jpg"
        }
      ],
      limitations: ["Public records may lag current AIS telemetry."],
      generatedAt: now
    });

    expect(parsed.sources[0]?.url).toContain("example.com");
    expect(parsed.image?.thumbnailUrl).toContain("vessel-thumb");
    expect(parsed.profile?.militaryClass).toBe("Type 45 destroyer");
    expect(parsed.profile?.classification).toBe("commercial");
  });

  it("validates aircraft web intel responses with optional images", () => {
    const parsed = aircraftIntelResponseSchema.parse({
      status: "ok",
      mode: "live",
      model: "gpt-5.4-mini",
      aircraftId: "icao24-43c6f1",
      profile: {
        matchedCallsign: "RFR7182",
        icao24: "43c6f1",
        registration: "ZZ343",
        aircraftType: "Airbus A400M Atlas",
        classification: "military",
        operator: "Royal Air Force",
        confidence: "medium"
      },
      summary: "Public sources identify a matching military aircraft.",
      facts: ["ICAO hex 43c6f1 appears in a public aircraft registry."],
      sources: [
        {
          title: "Example aircraft registry",
          url: "https://example.com/aircraft/43c6f1"
        }
      ],
      image: {
        imageUrl: "https://example.com/images/a400m.jpg",
        thumbnailUrl: "https://example.com/images/a400m-thumb.jpg",
        sourceUrl: "https://example.com/aircraft/43c6f1",
        caption: "Aircraft reference image"
      },
      limitations: ["Public aircraft records can lag live ADS-B telemetry."],
      generatedAt: now
    });

    expect(parsed.profile?.classification).toBe("military");
    expect(parsed.image?.thumbnailUrl).toContain("a400m-thumb");
  });

  it("rejects active or non-web URL schemes in vessel intel", () => {
    expect(() =>
      vesselIntelResponseSchema.parse({
        status: "ok",
        mode: "live",
        vesselId: "mmsi-232001234",
        summary: "Public sources identify a vessel with matching MMSI details.",
        facts: ["MMSI 232001234 appears in a public vessel registry."],
        sources: [
          {
            title: "Unsafe source",
            url: "javascript:alert(1)"
          }
        ],
        image: {
          imageUrl: "data:image/svg+xml,<svg></svg>"
        },
        limitations: ["Public records may lag current AIS telemetry."],
        generatedAt: now
      })
    ).toThrow();
  });

  it("rejects active or non-web URL schemes in aircraft intel", () => {
    expect(() =>
      aircraftIntelResponseSchema.parse({
        status: "ok",
        mode: "live",
        aircraftId: "icao24-43c6f1",
        summary: "Public sources identify a matching aircraft.",
        facts: ["ICAO hex 43c6f1 appears in a public registry."],
        sources: [
          {
            title: "Unsafe source",
            url: "javascript:alert(1)"
          }
        ],
        image: {
          imageUrl: "data:image/svg+xml,<svg></svg>"
        },
        limitations: ["Public records may lag current ADS-B telemetry."],
        generatedAt: now
      })
    ).toThrow();
  });
});

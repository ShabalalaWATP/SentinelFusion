import { describe, expect, it } from "vitest";
import type { AircraftIntelResponse, VesselIntelResponse } from "@aisstream/shared";
import {
  toFleetAnalysisAircraftIntel,
  toFleetAnalysisIntel,
  toSelectedAnalysisIntel
} from "./analysisIntelContext";

const baseIntel: VesselIntelResponse = {
  status: "ok",
  mode: "live",
  model: "gpt-5.4-mini",
  vesselId: "mmsi-232001234",
  profile: {
    matchedName: "NORTHERN LIGHT",
    classification: "commercial",
    confidence: "high"
  },
  summary: "Public sources identify this vessel by MMSI.",
  facts: ["Registry source lists MMSI 232001234."],
  sources: [{ title: "Example registry", url: "https://example.com/vessels/232001234" }],
  limitations: ["Public records can lag live AIS."],
  generatedAt: "2026-06-11T10:00:00.000Z"
};

const baseAircraftIntel: AircraftIntelResponse = {
  status: "ok",
  mode: "live",
  model: "gpt-5.4-mini",
  aircraftId: "icao24-43c6f1",
  profile: {
    matchedCallsign: "RFR7182",
    classification: "military",
    confidence: "medium"
  },
  summary: "Public sources identify this aircraft by ICAO hex.",
  facts: ["Registry source lists ICAO hex 43c6f1."],
  sources: [{ title: "Example registry", url: "https://example.com/aircraft/43c6f1" }],
  limitations: ["Public records can lag live ADS-B."],
  generatedAt: "2026-06-11T10:00:00.000Z"
};

describe("analysis intel context", () => {
  it("converts selected vessel intel into bounded analysis context", () => {
    const context = toSelectedAnalysisIntel({
      ...baseIntel,
      facts: Array.from({ length: 12 }, (_, index) => `Fact ${index + 1}.`)
    });

    expect(context?.[0]).toMatchObject({
      vesselId: baseIntel.vesselId,
      summary: baseIntel.summary,
      profile: { confidence: "high" }
    });
    expect(context?.[0]?.facts).toHaveLength(8);
  });

  it("limits fleet analysis intel to eight cached vessel results", () => {
    const context = toFleetAnalysisIntel(
      Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `vessel-${index}`,
          { ...baseIntel, vesselId: `vessel-${index}` }
        ])
      )
    );

    expect(context).toHaveLength(8);
  });

  it("limits fleet analysis intel to eight cached aircraft results", () => {
    const context = toFleetAnalysisAircraftIntel(
      Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `aircraft-${index}`,
          { ...baseAircraftIntel, aircraftId: `aircraft-${index}` }
        ])
      )
    );

    expect(context).toHaveLength(8);
    expect(context?.[0]?.profile?.classification).toBe("military");
  });
});

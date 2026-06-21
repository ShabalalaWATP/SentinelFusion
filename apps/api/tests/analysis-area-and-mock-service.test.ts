import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel, VesselMetrics } from "@aisstream/shared";
import type { AnalysisAreaFocus, AnalysisContext } from "../src/domain/interfaces";
import { toAnalysisAreaResult } from "../src/analysis/area-result";
import { MockAnalysisAgentService } from "../src/analysis/mock-analysis-agent-service";

const baseVessel: Vessel = {
  id: "vessel-a",
  mmsi: "232001234",
  name: "ALPHA",
  callSign: "ALPHA",
  shipType: "Cargo",
  latitude: 50.8,
  longitude: -1.1,
  speedOverGround: 12.4,
  courseOverGround: 90,
  heading: 90,
  destination: "Portsmouth",
  navigationalStatus: "Under way using engine",
  timestamp: "2026-06-11T10:00:00.000Z",
  lastUpdated: "2026-06-11T10:00:00.000Z",
  riskLevel: "low",
  track: []
};

const baseAircraft: Aircraft = {
  id: "aircraft-a",
  icao24: "abc123",
  callsign: "RFR123",
  registration: "ZZ123",
  aircraftType: "A400M",
  classification: "military",
  emergency: false,
  latitude: 50.82,
  longitude: -1.12,
  altitudeFt: 20000,
  groundSpeedKt: 320,
  headingDeg: 90,
  timestamp: "2026-06-11T10:00:00.000Z",
  lastUpdated: "2026-06-11T10:00:00.000Z",
  riskLevel: "medium",
  track: []
};

const metrics: VesselMetrics = {
  total: 2,
  moving: 1,
  stationary: 1,
  highRiskVessels: 1,
  averageSpeed: 8.4,
  militaryVessels: 1,
  uniqueShipTypes: 2
};

function areaFocus(overrides: Partial<AnalysisAreaFocus> = {}): AnalysisAreaFocus {
  const vessels = [
    { ...baseVessel, id: "low-zulu", name: "ZULU", riskLevel: "low" as const },
    {
      ...baseVessel,
      id: "high-alpha",
      mmsi: "232001235",
      name: "ALPHA HIGH",
      shipType: "Military ops",
      riskLevel: "high" as const
    }
  ];
  const aircraft = [
    { ...baseAircraft, id: "medium-z", callsign: "ZZZ", riskLevel: "medium" as const },
    {
      ...baseAircraft,
      id: "high-a",
      icao24: "def456",
      callsign: undefined,
      registration: "AAA",
      riskLevel: "high" as const,
      emergency: true
    }
  ];

  return {
    id: "portsmouth",
    name: "Portsmouth area",
    matchedText: "portsmouth",
    bounds: { south: 50.7, west: -1.4, north: 51, east: -0.9 },
    vesselCount: vessels.length,
    highRiskVessels: 1,
    militaryVessels: 1,
    averageSpeed: 10,
    vessels,
    aircraftCount: aircraft.length,
    militaryAircraft: 2,
    emergencyAircraft: 1,
    averageAircraftAltitudeFt: 20000,
    averageAircraftSpeedKt: 320,
    aircraft,
    ...overrides
  };
}

function context(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  const vessels = [
    baseVessel,
    {
      ...baseVessel,
      id: "vessel-b",
      mmsi: "232001235",
      name: "BRAVO",
      riskLevel: "high" as const
    }
  ];

  return {
    request: { question: "What is happening?" },
    vessels,
    metrics,
    aircraft: [baseAircraft],
    aircraftMetrics: {
      total: 1,
      military: 1,
      emergency: 0,
      averageAltitudeFt: 20000,
      averageSpeedKt: 320,
      stale: 0
    },
    ...overrides
  };
}

describe("analysis area result", () => {
  it("sorts area vessels and aircraft by risk and operator label", () => {
    const result = toAnalysisAreaResult(areaFocus());

    expect(result).toMatchObject({
      id: "portsmouth",
      name: "Portsmouth area",
      count: 2,
      listedCount: 2,
      aircraftCount: 2,
      listedAircraftCount: 2,
      highRiskCount: 1,
      militaryCount: 1,
      militaryAircraftCount: 2,
      emergencyAircraftCount: 1
    });
    expect(result.vessels.map((vessel) => [vessel.id, vessel.riskLevel])).toEqual([
      ["high-alpha", "high"],
      ["low-zulu", "low"]
    ]);
    expect(result.aircraft.map((aircraft) => [aircraft.id, aircraft.riskLevel])).toEqual([
      ["high-a", "high"],
      ["medium-z", "medium"]
    ]);
    expect(result.aircraft[0]).toMatchObject({
      registration: "AAA",
      emergency: true,
      classification: "military"
    });
  });
});

describe("mock analysis agent", () => {
  const service = new MockAnalysisAgentService();

  it("returns a clear empty snapshot summary", async () => {
    await expect(
      service.analyse(
        context({
          vessels: [],
          aircraft: [],
          metrics: { ...metrics, total: 0, highRiskVessels: 0, militaryVessels: 0 },
          aircraftMetrics: undefined
        })
      )
    ).resolves.toMatchObject({
      status: "ok",
      mode: "mock",
      riskLevel: "low",
      keyFindings: ["No server-side vessel records are currently available."],
      recommendedActions: [
        "Continue monitoring the live feed for changes in speed, status, or density.",
        "Select a vessel for a more focused assessment."
      ]
    });
  });

  it("uses selected vessel, cached intel, and landmark evidence for focused analysis", async () => {
    const selectedVessel = {
      ...baseVessel,
      riskLevel: "medium" as const,
      speedOverGround: 6.7,
      courseOverGround: 181
    };

    const summary = await service.analyse(
      context({
        selectedVessel,
        vesselIntel: [{ id: selectedVessel.id, summary: "Known ferry route.", sources: [] }],
        aircraftIntel: [{ id: baseAircraft.id, summary: "Military transport.", sources: [] }],
        landmarkContext: {
          reference: "selected_vessel",
          landmarks: [
            {
              id: "portsmouth",
              name: "Portsmouth Harbour",
              category: "port",
              aliases: ["portsmouth"],
              latitude: 50.8,
              longitude: -1.1,
              distanceNm: 2.4
            }
          ]
        }
      })
    );

    expect(summary.summary).toContain("moderate traffic");
    expect(summary.riskLevel).toBe("medium");
    expect(summary.keyFindings).toEqual([
      "ALPHA is reporting 6.7 kn on course 181 degrees.",
      "The vessel risk state is medium with navigation status Under way using engine."
    ]);
    expect(summary.evidence).toContain("Cached web intel: Known ferry route.");
    expect(summary.evidence).toContain("Cached aircraft intel available for 1 aircraft.");
    expect(summary.evidence).toContain("Nearest landmark context: Portsmouth Harbour at 2.4 NM.");
  });

  it("summarises area traffic with live vessel and aircraft counts", async () => {
    const area = areaFocus();
    const summary = await service.analyse(
      context({
        areaFocus: area,
        landmarkContext: {
          reference: "area",
          landmarks: [
            {
              id: "solent",
              name: "The Solent",
              category: "landmark",
              aliases: ["solent"],
              latitude: 50.75,
              longitude: -1.25
            }
          ]
        },
        vesselIntel: [{ id: "high-alpha", summary: "Military support ship.", sources: [] }],
        aircraftIntel: [{ id: "high-a", summary: "Emergency aircraft.", sources: [] }]
      })
    );

    expect(summary.summary).toBe("2 vessels and 2 aircraft are currently inside Portsmouth area.");
    expect(summary.area).toMatchObject({
      id: "portsmouth",
      count: 2,
      aircraftCount: 2,
      highRiskCount: 1,
      emergencyAircraftCount: 1
    });
    expect(summary.keyFindings).toEqual([
      "2 vessels are inside Portsmouth area.",
      "2 aircraft are inside Portsmouth area.",
      "1 area vessels are high risk, 1 vessels are military, 2 aircraft are military, and 1 aircraft are emergency flagged."
    ]);
    expect(summary.evidence).toContain("Matched 'portsmouth' to Portsmouth area.");
    expect(summary.evidence).toContain("Landmark context includes The Solent.");
    expect(summary.evidence).toContain("Cached web intel available for 1 vessels.");
    expect(summary.evidence).toContain("Cached aircraft intel available for 1 aircraft.");
  });
});

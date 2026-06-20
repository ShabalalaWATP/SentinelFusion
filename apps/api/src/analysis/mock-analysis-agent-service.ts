import type { AnalysisSummary, RiskLevel, Vessel } from "@aisstream/shared";
import { analysisSummarySchema } from "@aisstream/shared";
import type { AnalysisContext, IAnalysisAgentService } from "../domain/interfaces";
import { toAnalysisAreaResult } from "./area-result";

export class MockAnalysisAgentService implements IAnalysisAgentService {
  async analyse(context: AnalysisContext): Promise<AnalysisSummary> {
    const vessel = context.selectedVessel;
    const area = context.areaFocus;
    const riskLevel =
      vessel?.riskLevel ??
      (area ? deriveFleetRisk(area.highRiskVessels) : deriveFleetRisk(context.metrics.highRiskVessels));
    const scope = vessel
      ? `${vessel.name} (${vessel.mmsi})`
      : area
        ? area.name
        : "the current vessel picture";
    const summary =
      context.vessels.length === 0 && context.aircraft.length === 0
        ? "No ships or aircraft are currently available in the repository, so analysis is limited to an empty snapshot."
        : area
          ? areaSummary(area)
        : `Mock analysis for ${scope}: ${summariseRisk(riskLevel)}.`;

    return analysisSummarySchema.parse({
      status: "ok",
      mode: "mock",
      model: "deterministic-local",
      summary,
      riskLevel,
      keyFindings: buildFindings(context.vessels, vessel, area),
      recommendedActions: buildActions(riskLevel, vessel, area),
      evidence: buildEvidence(context),
      limitations: [
        "This is deterministic local analysis, not a live OpenAI model response.",
        "Area matching uses a local named-area registry.",
        "Landmark context uses a local registry of major ports, naval bases, chokepoints, and landmarks.",
        "AIS and ADS-B data can be delayed, incomplete, spoofed, or missing static fields."
      ],
      ...(area ? { area: toAnalysisAreaResult(area) } : {}),
      generatedAt: new Date().toISOString()
    });
  }
}

function deriveFleetRisk(highRiskVessels: number): RiskLevel {
  return highRiskVessels > 0 ? "high" : "low";
}

function summariseRisk(riskLevel: RiskLevel): string {
  if (riskLevel === "high") {
    return "high-risk indicators are present and should be reviewed promptly";
  }

  if (riskLevel === "medium") {
    return "moderate traffic or vessel indicators deserve operator attention";
  }

  return "no immediate high-risk indicators are present in the current snapshot";
}

function buildFindings(
  vessels: Vessel[],
  vessel: Vessel | undefined,
  area: AnalysisContext["areaFocus"]
): string[] {
  if (vessels.length === 0) {
    return ["No server-side vessel records are currently available."];
  }

  if (area) {
    return [
      `${area.vesselCount} vessels are inside ${area.name}.`,
      `${area.aircraftCount} aircraft are inside ${area.name}.`,
      `${area.highRiskVessels} area vessels are high risk, ${area.militaryVessels} vessels are military, ${area.militaryAircraft} aircraft are military, and ${area.emergencyAircraft} aircraft are emergency flagged.`
    ];
  }

  if (vessel) {
    return [
      `${vessel.name} is reporting ${vessel.speedOverGround.toFixed(1)} kn on course ${Math.round(
        vessel.courseOverGround
      )} degrees.`,
      `The vessel risk state is ${vessel.riskLevel} with navigation status ${vessel.navigationalStatus}.`
    ];
  }

  const highRiskCount = vessels.filter((item) => item.riskLevel === "high").length;
  return [
    `${vessels.length} vessels are currently tracked server-side.`,
    `${highRiskCount} vessels are flagged high risk by local rules.`
  ];
}

function buildActions(
  riskLevel: RiskLevel,
  vessel: Vessel | undefined,
  area: AnalysisContext["areaFocus"]
): string[] {
  if (riskLevel === "high") {
    return [
      "Prioritise operator review of the flagged vessel or traffic cluster.",
      "Cross-check AIS behaviour against charted routes and port movement plans."
    ];
  }

  if (vessel) {
    return [
      "Continue monitoring vessel course, speed, and destination changes.",
      "Review nearby traffic before making operational decisions."
    ];
  }

  if (area) {
    return [
      "Use the area count as a live operational snapshot, not a historical total.",
      "Review individual high-risk, military, or emergency flags before making operational decisions."
    ];
  }

  return [
    "Continue monitoring the live feed for changes in speed, status, or density.",
    "Select a vessel for a more focused assessment."
  ];
}

function buildEvidence(context: AnalysisContext): string[] {
  const { areaFocus: area, selectedVessel: vessel, vessels } = context;
  const nearestLandmark = context.landmarkContext?.landmarks[0];
  const aircraftIntel = context.aircraftIntel?.[0];
  const webIntel = context.vesselIntel?.[0];

  if (vessel) {
    const evidence = [
      `MMSI ${vessel.mmsi}, type ${vessel.shipType}, destination ${vessel.destination ?? "unknown"}.`
    ];

    if (webIntel) {
      evidence.push(`Cached web intel: ${webIntel.summary}`);
    }

    if (aircraftIntel) {
      evidence.push(`Cached aircraft intel available for ${context.aircraftIntel?.length ?? 0} aircraft.`);
    }

    if (nearestLandmark) {
      evidence.push(
        `Nearest landmark context: ${nearestLandmark.name}${
          nearestLandmark.distanceNm ? ` at ${nearestLandmark.distanceNm} NM` : ""
        }.`
      );
    }

    return evidence;
  }

  if (area) {
    const evidence = [
      `Matched '${area.matchedText}' to ${area.name}.`,
      `Bounds: ${area.bounds.south} to ${area.bounds.north} latitude, ${area.bounds.west} to ${area.bounds.east} longitude.`,
      `Area snapshot includes ${area.vesselCount} vessels and ${area.aircraftCount} aircraft.`
    ];

    if (nearestLandmark) {
      evidence.push(`Landmark context includes ${nearestLandmark.name}.`);
    }

    if (webIntel) {
      evidence.push(`Cached web intel available for ${context.vesselIntel?.length ?? 0} vessels.`);
    }

    if (aircraftIntel) {
      evidence.push(`Cached aircraft intel available for ${context.aircraftIntel?.length ?? 0} aircraft.`);
    }

    return evidence;
  }

  return nearestLandmark
    ? [
        `Repository snapshot contains ${vessels.length} vessels and ${context.aircraft.length} aircraft.`,
        `Landmark context includes ${nearestLandmark.name}.`,
        ...(webIntel
          ? [`Cached web intel available for ${context.vesselIntel?.length ?? 0} vessels.`]
          : []),
        ...(aircraftIntel
          ? [`Cached aircraft intel available for ${context.aircraftIntel?.length ?? 0} aircraft.`]
          : [])
      ]
    : [
        `Repository snapshot contains ${vessels.length} vessels and ${context.aircraft.length} aircraft.`,
        ...(webIntel
          ? [`Cached web intel available for ${context.vesselIntel?.length ?? 0} vessels.`]
          : []),
        ...(aircraftIntel
          ? [`Cached aircraft intel available for ${context.aircraftIntel?.length ?? 0} aircraft.`]
          : [])
      ];
}

function areaSummary(area: NonNullable<AnalysisContext["areaFocus"]>): string {
  const wantsAircraft = area.aircraftCount > 0 && area.vesselCount === 0;
  if (wantsAircraft) {
    return `${area.aircraftCount} aircraft are currently inside ${area.name}.`;
  }

  if (area.aircraftCount > 0) {
    return `${area.vesselCount} vessels and ${area.aircraftCount} aircraft are currently inside ${area.name}.`;
  }

  return `${area.vesselCount} vessels are currently inside ${area.name}.`;
}

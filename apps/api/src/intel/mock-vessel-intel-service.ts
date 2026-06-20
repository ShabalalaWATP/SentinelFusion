import type { Vessel, VesselIntelResponse } from "@aisstream/shared";
import { classifyVessel, vesselIntelResponseSchema } from "@aisstream/shared";
import type { IVesselIntelService } from "../domain/interfaces";

export class MockVesselIntelService implements IVesselIntelService {
  async enrich(vessel: Vessel): Promise<VesselIntelResponse> {
    return vesselIntelResponseSchema.parse({
      status: "ok",
      mode: "mock",
      model: "deterministic-local",
      vesselId: vessel.id,
      profile: {
        matchedName: vessel.name,
        mmsi: vessel.mmsi,
        callSign: vessel.callSign,
        vesselType: vessel.shipType,
        militaryClass: classifyVessel(vessel) !== "civilian" ? "Public class not resolved in mock mode" : undefined,
        classification: toIntelClassification(classifyVessel(vessel)),
        confidence: "low"
      },
      summary: `${vessel.name} is currently represented by AIS telemetry only. No external web search was run in mock mode.`,
      facts: buildLocalFacts(vessel),
      sources: [],
      limitations: [
        "This is deterministic local intel, not a live web search.",
        "AIS names, destinations, and static fields can be delayed, incomplete, spoofed, or ambiguous."
      ],
      generatedAt: new Date().toISOString()
    });
  }
}

function buildLocalFacts(vessel: Vessel): string[] {
  const facts = [
    `MMSI ${vessel.mmsi}.`,
    `AIS ship type is ${vessel.shipType}.`,
    `Last reported position is ${vessel.latitude.toFixed(4)}, ${vessel.longitude.toFixed(4)}.`,
    `Speed is ${vessel.speedOverGround.toFixed(1)} kn on course ${Math.round(
      vessel.courseOverGround
    )} degrees.`
  ];

  if (vessel.callSign) {
    facts.push(`Call sign ${vessel.callSign}.`);
  }

  if (vessel.destination) {
    facts.push(`AIS destination is ${vessel.destination}.`);
  }

  return facts.slice(0, 8);
}

function toIntelClassification(
  classification: ReturnType<typeof classifyVessel>
): "military" | "government" | "unknown" {
  return classification === "civilian" ? "unknown" : classification;
}

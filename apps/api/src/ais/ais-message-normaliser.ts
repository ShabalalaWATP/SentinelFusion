import type { AisRawMessage, RiskLevel, Vessel } from "@aisstream/shared";
import { aisRawMessageSchema, vesselSchema } from "@aisstream/shared";
import type { IAisMessageNormaliser } from "../domain/interfaces";

const MAX_TRACK_POINTS = 80;

export class AisMessageNormaliser implements IAisMessageNormaliser {
  normalise(message: AisRawMessage, previous?: Vessel): Vessel {
    const parsed = aisRawMessageSchema.parse(message);
    const timestamp = parsed.timestamp;
    const track = [
      ...(previous?.track ?? []),
      {
        longitude: parsed.longitude,
        latitude: parsed.latitude,
        timestamp
      }
    ].slice(-MAX_TRACK_POINTS);

    return vesselSchema.parse({
      id: `mmsi-${parsed.mmsi}`,
      mmsi: parsed.mmsi,
      name: sanitiseText(parsed.name, `Vessel ${parsed.mmsi}`, 120),
      callSign: sanitiseOptionalText(parsed.callSign, 32),
      shipType: sanitiseText(parsed.shipType, "Unspecified", 80),
      longitude: parsed.longitude,
      latitude: parsed.latitude,
      speedOverGround: parsed.speedOverGround,
      courseOverGround: parsed.courseOverGround,
      heading: parsed.heading,
      destination: sanitiseOptionalText(parsed.destination, 160),
      navigationalStatus: sanitiseText(
        parsed.navigationalStatus,
        "Unknown",
        80
      ),
      riskLevel: calculateRisk(parsed),
      lastUpdated: timestamp,
      track
    });
  }
}

function sanitiseText(value: string | undefined, fallback: string, maxLength: number): string {
  const cleaned = sanitiseOptionalText(value, maxLength);
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function sanitiseOptionalText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value?.replace(/[<>]/g, "").replace(/\p{Cc}/gu, "").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function calculateRisk(message: AisRawMessage): RiskLevel {
  if (message.speedOverGround > 24 || message.navigationalStatus === "Restricted manoeuvrability") {
    return "high";
  }

  if (message.speedOverGround > 16 || message.navigationalStatus === "Constrained by draught") {
    return "medium";
  }

  return "low";
}

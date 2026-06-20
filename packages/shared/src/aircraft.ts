import type { AircraftClassification } from "./types";

const militaryTextPattern =
  /\b(?:air\s*force|army|navy|naval|marine|military|raf|usaf|rmaf|nato|awacs|tanker|typhoon|f-?\d{1,2}|c-?17|a400m|kc-?\d{2,3}|hercules|chinook|apache)\b/i;
const governmentTextPattern =
  /\b(?:police|coast\s*guard|border|customs|rescue|ambulance|lifeguard|sar|state|government)\b/i;
const privateTextPattern = /\b(?:private|bizjet|business|corporate)\b/i;
const commercialTextPattern =
  /\b(?:airlines?|airways|cargo|express|easyjet|ryanair|british\s*airways|virgin|emirates|qatar|lufthansa|klm|delta|united)\b/i;

export type AircraftIdentity = {
  aircraftType?: string;
  callsign?: string;
  category?: string;
  operator?: string;
  registration?: string;
};

export function classifyAircraft(aircraft: AircraftIdentity): AircraftClassification {
  const values = [
    aircraft.callsign,
    aircraft.operator,
    aircraft.aircraftType,
    aircraft.category,
    aircraft.registration
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (values.some((value) => militaryTextPattern.test(value))) {
    return "military";
  }

  if (values.some((value) => governmentTextPattern.test(value))) {
    return "government";
  }

  if (values.some((value) => privateTextPattern.test(value))) {
    return "private";
  }

  if (values.some((value) => commercialTextPattern.test(value))) {
    return "commercial";
  }

  return "unknown";
}

export function isMilitaryAircraft(aircraft: AircraftIdentity): boolean {
  return classifyAircraft(aircraft) === "military";
}

export function isGovernmentAircraft(aircraft: AircraftIdentity): boolean {
  return classifyAircraft(aircraft) === "government";
}

export function isClassifiedAircraft(aircraft: AircraftIdentity): boolean {
  return classifyAircraft(aircraft) !== "unknown";
}

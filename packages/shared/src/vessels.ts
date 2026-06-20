import type { Vessel } from "./types";

const militaryShipTypePattern = /\b(?:ais\s*type\s*)?35\b/i;
const militaryTextPattern = /\b(?:military|naval|navy|warship|coast\s*guard|hms|uss|fns|fgs|hnoms|rfa)\b/i;
const governmentTextPattern =
  /\b(?:government|coast\s*guard|border\s*force|customs|police|lifeboat|search\s*and\s*rescue|sar|fishery\s*protection|patrol)\b/i;

type VesselIdentity = Pick<Vessel, "callSign" | "name" | "shipType">;

export type VesselClassification = "military" | "government" | "civilian";

export function isMilitaryVessel(vessel: VesselIdentity): boolean {
  if (militaryShipTypePattern.test(vessel.shipType)) {
    return true;
  }

  return [vessel.name, vessel.shipType, vessel.callSign ?? ""].some((value) =>
    militaryTextPattern.test(value)
  );
}

export function isGovernmentVessel(vessel: VesselIdentity): boolean {
  if (isMilitaryVessel(vessel)) {
    return false;
  }

  return [vessel.name, vessel.shipType, vessel.callSign ?? ""].some((value) =>
    governmentTextPattern.test(value)
  );
}

export function classifyVessel(vessel: VesselIdentity): VesselClassification {
  if (isMilitaryVessel(vessel)) {
    return "military";
  }

  if (isGovernmentVessel(vessel)) {
    return "government";
  }

  return "civilian";
}

export function isClassifiedVessel(vessel: VesselIdentity): boolean {
  return classifyVessel(vessel) !== "civilian";
}

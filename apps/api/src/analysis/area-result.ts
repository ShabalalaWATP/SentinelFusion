import type { Aircraft, AnalysisAreaResult, RiskLevel, Vessel } from "@aisstream/shared";
import { classifyVessel } from "@aisstream/shared";
import type { AnalysisAreaFocus } from "../domain/interfaces";

const maxListedVessels = 200;
const maxListedAircraft = 200;

export function toAnalysisAreaResult(area: AnalysisAreaFocus): AnalysisAreaResult {
  const vessels = sortAreaVessels(area.vessels)
    .slice(0, maxListedVessels)
    .map((vessel) => ({
      id: vessel.id,
      mmsi: vessel.mmsi,
      name: vessel.name,
      shipType: vessel.shipType,
      longitude: vessel.longitude,
      latitude: vessel.latitude,
      speedOverGround: vessel.speedOverGround,
      courseOverGround: vessel.courseOverGround,
      riskLevel: vessel.riskLevel,
      classification: classifyVessel(vessel)
    }));
  const aircraft = sortAreaAircraft(area.aircraft)
    .slice(0, maxListedAircraft)
    .map((item) => ({
      id: item.id,
      icao24: item.icao24,
      ...(item.callsign ? { callsign: item.callsign } : {}),
      ...(item.registration ? { registration: item.registration } : {}),
      ...(item.aircraftType ? { aircraftType: item.aircraftType } : {}),
      longitude: item.longitude,
      latitude: item.latitude,
      ...(item.altitudeFt !== undefined ? { altitudeFt: item.altitudeFt } : {}),
      ...(item.groundSpeedKt !== undefined ? { groundSpeedKt: item.groundSpeedKt } : {}),
      riskLevel: item.riskLevel,
      classification: item.classification,
      emergency: item.emergency
    }));

  return {
    id: area.id,
    name: area.name,
    bounds: area.bounds,
    count: area.vesselCount,
    listedCount: vessels.length,
    highRiskCount: area.highRiskVessels,
    militaryCount: area.militaryVessels,
    averageSpeedKn: area.averageSpeed,
    aircraftCount: area.aircraftCount,
    listedAircraftCount: aircraft.length,
    militaryAircraftCount: area.militaryAircraft,
    emergencyAircraftCount: area.emergencyAircraft,
    averageAircraftAltitudeFt: area.averageAircraftAltitudeFt,
    averageAircraftSpeedKt: area.averageAircraftSpeedKt,
    vessels,
    aircraft
  };
}

function sortAreaVessels(vessels: Vessel[]): Vessel[] {
  return [...vessels].sort((left, right) => {
    const riskDifference = riskRank(right.riskLevel) - riskRank(left.riskLevel);
    if (riskDifference !== 0) {
      return riskDifference;
    }

    return left.name.localeCompare(right.name, "en-GB");
  });
}

function riskRank(riskLevel: RiskLevel): number {
  if (riskLevel === "high") {
    return 3;
  }

  if (riskLevel === "medium") {
    return 2;
  }

  return 1;
}

function sortAreaAircraft(aircraft: Aircraft[]): Aircraft[] {
  return [...aircraft].sort((left, right) => {
    const riskDifference = riskRank(right.riskLevel) - riskRank(left.riskLevel);
    if (riskDifference !== 0) {
      return riskDifference;
    }

    return aircraftLabel(left).localeCompare(aircraftLabel(right), "en-GB");
  });
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24;
}

import {
  isCoordinateInsideBounds,
  isMilitaryVessel,
  resolveTrafficAreaByText,
  type Aircraft,
  type Vessel
} from "@aisstream/shared";
import type { AnalysisAreaFocus } from "../domain/interfaces";

export function resolveAreaFocus(
  question: string,
  vessels: Vessel[],
  aircraft: Aircraft[] = []
): AnalysisAreaFocus | undefined {
  const match = resolveTrafficAreaByText(question);

  if (!match) {
    return undefined;
  }

  return buildAreaFocus(
    {
      id: match.area.id,
      name: match.area.name,
      matchedText: match.matchedAlias,
      bounds: match.area.bounds
    },
    vessels,
    aircraft
  );
}

export function resolveAreaBoundsFocus(
  bounds: AnalysisAreaFocus["bounds"],
  vessels: Vessel[],
  aircraft: Aircraft[] = []
): AnalysisAreaFocus {
  return buildAreaFocus(
    {
      id: "selected-map-area",
      name: "Selected map area",
      matchedText: "drawn map area",
      bounds
    },
    vessels,
    aircraft
  );
}

function buildAreaFocus(
  definition: Pick<AnalysisAreaFocus, "bounds" | "id" | "matchedText" | "name">,
  vessels: Vessel[],
  aircraft: Aircraft[]
): AnalysisAreaFocus {
  const areaVessels = vessels.filter((vessel) =>
    isCoordinateInsideBounds(vessel, definition.bounds)
  );
  const areaAircraft = aircraft.filter((item) =>
    isCoordinateInsideBounds(item, definition.bounds)
  );
  const speedTotal = areaVessels.reduce((total, vessel) => total + vessel.speedOverGround, 0);
  const aircraftWithSpeed = areaAircraft.filter((item) => item.groundSpeedKt !== undefined);
  const aircraftSpeedTotal = aircraftWithSpeed.reduce(
    (total, item) => total + (item.groundSpeedKt ?? 0),
    0
  );
  const airborneAircraft = areaAircraft.filter((item) => item.altitudeFt !== undefined && !item.onGround);
  const altitudeTotal = airborneAircraft.reduce((total, item) => total + (item.altitudeFt ?? 0), 0);

  return {
    ...definition,
    vesselCount: areaVessels.length,
    highRiskVessels: areaVessels.filter((vessel) => vessel.riskLevel === "high").length,
    militaryVessels: areaVessels.filter(isMilitaryVessel).length,
    averageSpeed: areaVessels.length === 0 ? 0 : Number((speedTotal / areaVessels.length).toFixed(1)),
    vessels: areaVessels,
    aircraftCount: areaAircraft.length,
    militaryAircraft: areaAircraft.filter((item) => item.classification === "military").length,
    emergencyAircraft: areaAircraft.filter((item) => item.emergency).length,
    averageAircraftAltitudeFt:
      airborneAircraft.length === 0 ? 0 : Math.round(altitudeTotal / airborneAircraft.length),
    averageAircraftSpeedKt:
      aircraftWithSpeed.length === 0
        ? 0
        : Number((aircraftSpeedTotal / aircraftWithSpeed.length).toFixed(1)),
    aircraft: areaAircraft
  };
}

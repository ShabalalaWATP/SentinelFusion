import {
  isClassifiedVessel,
  isCoordinateInsideBounds,
  type Aircraft,
  type Vessel
} from "@aisstream/shared";
import type { AreaAnomalyMonitor, EntityAnomalyMonitor } from "../stores/anomalyStore";

export type DetectedAnomaly = {
  id: string;
  entityDomain: "vessel" | "aircraft";
  entityId: string;
  entityLabel: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  occurredAt: string;
};

export function detectAnomalies({
  aircraft,
  areaMonitors,
  entityMonitors,
  vessels
}: {
  aircraft: Aircraft[];
  areaMonitors: AreaAnomalyMonitor[];
  entityMonitors: EntityAnomalyMonitor[];
  vessels: Vessel[];
}): DetectedAnomaly[] {
  const activeAreas = areaMonitors.filter((monitor) => monitor.active);
  const activeEntities = entityMonitors.filter((monitor) => monitor.active);
  const now = new Date().toISOString();

  return [
    ...vessels.flatMap((vessel) => vesselAnomalies(vessel, activeAreas, activeEntities, now)),
    ...aircraft.flatMap((item) => aircraftAnomalies(item, activeAreas, activeEntities, now))
  ].slice(0, 80);
}

function vesselAnomalies(
  vessel: Vessel,
  areaMonitors: AreaAnomalyMonitor[],
  entityMonitors: EntityAnomalyMonitor[],
  occurredAt: string
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  const monitored = entityMonitors.some(
    (monitor) => monitor.domain === "vessel" && monitor.id === vessel.id
  );
  const area = areaMonitors.find((monitor) => isCoordinateInsideBounds(vessel, monitor.bounds));

  if (monitored && (vessel.riskLevel === "high" || isClassifiedVessel(vessel))) {
    anomalies.push(toAnomaly(vessel, "high", "Monitored vessel risk", `${vessel.name} is individually monitored and currently classified as ${vessel.riskLevel} risk or government/military.`, "Entity anomaly monitor", occurredAt));
  }

  if (area && vessel.speedOverGround <= 0.5 && vessel.track.length > 1) {
    anomalies.push(toAnomaly(vessel, "medium", "Stopped vessel in watched area", `${vessel.name} is nearly stationary inside ${area.name}.`, `Area monitor: ${area.name}`, occurredAt));
  }

  if (area && vessel.speedOverGround >= 30) {
    anomalies.push(toAnomaly(vessel, "medium", "Fast vessel in watched area", `${vessel.name} is reporting ${vessel.speedOverGround.toFixed(1)} kn inside ${area.name}.`, `Area monitor: ${area.name}`, occurredAt));
  }

  return anomalies;
}

function aircraftAnomalies(
  aircraft: Aircraft,
  areaMonitors: AreaAnomalyMonitor[],
  entityMonitors: EntityAnomalyMonitor[],
  occurredAt: string
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  const label = aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
  const monitored = entityMonitors.some(
    (monitor) => monitor.domain === "aircraft" && monitor.id === aircraft.id
  );
  const area = areaMonitors.find((monitor) => isCoordinateInsideBounds(aircraft, monitor.bounds));

  if (monitored && (aircraft.riskLevel === "high" || aircraft.emergency)) {
    anomalies.push({
      id: `anomaly-aircraft-${aircraft.id}-monitored-risk`,
      entityDomain: "aircraft",
      entityId: aircraft.id,
      entityLabel: label,
      severity: aircraft.emergency ? "critical" : "high",
      title: aircraft.emergency ? "Emergency aircraft monitored" : "Monitored aircraft risk",
      description: `${label} is individually monitored and currently has elevated risk state.`,
      source: "Entity anomaly monitor",
      occurredAt
    });
  }

  if (area && aircraft.emergency) {
    anomalies.push({
      id: `anomaly-aircraft-${aircraft.id}-emergency-${area.id}`,
      entityDomain: "aircraft",
      entityId: aircraft.id,
      entityLabel: label,
      severity: "critical",
      title: "Emergency aircraft in watched area",
      description: `${label} is squawking or reporting emergency state inside ${area.name}.`,
      source: `Area monitor: ${area.name}`,
      occurredAt
    });
  }

  if (area && aircraft.groundSpeedKt && aircraft.groundSpeedKt >= 550) {
    anomalies.push({
      id: `anomaly-aircraft-${aircraft.id}-fast-${area.id}`,
      entityDomain: "aircraft",
      entityId: aircraft.id,
      entityLabel: label,
      severity: "medium",
      title: "Fast aircraft in watched area",
      description: `${label} is reporting ${aircraft.groundSpeedKt.toFixed(0)} kt inside ${area.name}.`,
      source: `Area monitor: ${area.name}`,
      occurredAt
    });
  }

  return anomalies;
}

function toAnomaly(
  vessel: Vessel,
  severity: DetectedAnomaly["severity"],
  title: string,
  description: string,
  source: string,
  occurredAt: string
): DetectedAnomaly {
  return {
    id: `anomaly-vessel-${vessel.id}-${slug(title)}-${slug(source)}`,
    entityDomain: "vessel",
    entityId: vessel.id,
    entityLabel: vessel.name,
    severity,
    title,
    description,
    source,
    occurredAt
  };
}

function slug(value: string): string {
  return value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

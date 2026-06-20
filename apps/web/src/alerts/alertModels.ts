import {
  isClassifiedAircraft,
  isClassifiedVessel,
  isMilitaryAircraft,
  isMilitaryVessel,
  type Aircraft,
  type AircraftIdentity,
  type Vessel
} from "@aisstream/shared";
import type { TrafficRuleEvent } from "../stores/trafficRuleStore";
import type { DetectedAnomaly } from "./anomalyDetection";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "active" | "acknowledged" | "dismissed";
export type AlertEntityDomain = "vessel" | "aircraft" | "area";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  title: string;
  description: string;
  entityDomain: AlertEntityDomain;
  entityId?: string;
  entityLabel?: string;
  occurredAt: string;
};

export function buildAlertItems({
  acknowledged,
  aircraft,
  anomalies,
  dismissed,
  events,
  vessels
}: {
  acknowledged: Record<string, string>;
  aircraft: Aircraft[];
  anomalies: DetectedAnomaly[];
  dismissed: Record<string, string>;
  events: TrafficRuleEvent[];
  vessels: Vessel[];
}): AlertItem[] {
  const alerts = [
    ...vessels.flatMap(vesselAlerts),
    ...aircraft.flatMap(aircraftAlerts),
    ...events.slice(0, 25).map(eventAlert),
    ...anomalies.map(anomalyAlert)
  ];

  return uniqueAlerts(alerts)
    .map((alert) => ({
      ...alert,
      status: dismissed[alert.id] ? "dismissed" : acknowledged[alert.id] ? "acknowledged" : "active"
    }) satisfies AlertItem)
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
}

function vesselAlerts(vessel: Vessel): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (vessel.riskLevel === "high") {
    alerts.push({
      id: `vessel-${vessel.id}-high-risk`,
      severity: "high",
      status: "active",
      source: "AIS risk model",
      title: "High-risk vessel",
      description: `${vessel.name} is currently marked high risk.`,
      entityDomain: "vessel",
      entityId: vessel.id,
      entityLabel: vessel.name,
      occurredAt: vessel.lastUpdated
    });
  }

  if (isClassifiedVessel(vessel)) {
    alerts.push({
      id: `vessel-${vessel.id}-classified`,
      severity: isMilitaryVessel(vessel) ? "high" : "medium",
      status: "active",
      source: "AIS classification",
      title: isMilitaryVessel(vessel) ? "Military vessel" : "Government vessel",
      description: `${vessel.name} is classified from AIS identity fields as ${isMilitaryVessel(vessel) ? "military" : "government"}.`,
      entityDomain: "vessel",
      entityId: vessel.id,
      entityLabel: vessel.name,
      occurredAt: vessel.lastUpdated
    });
  }

  return alerts;
}

function aircraftAlerts(aircraft: Aircraft): AlertItem[] {
  const label = aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
  const alerts: AlertItem[] = [];

  if (aircraft.emergency) {
    alerts.push({
      id: `aircraft-${aircraft.id}-emergency`,
      severity: "critical",
      status: "active",
      source: "ADS-B emergency state",
      title: "Emergency aircraft",
      description: `${label} is reporting an emergency state.`,
      entityDomain: "aircraft",
      entityId: aircraft.id,
      entityLabel: label,
      occurredAt: aircraft.lastUpdated
    });
  }

  const identity = toAircraftIdentity(aircraft);

  if (isClassifiedAircraft(identity) && (isMilitaryAircraft(identity) || aircraft.riskLevel === "high")) {
    alerts.push({
      id: `aircraft-${aircraft.id}-classified`,
      severity: isMilitaryAircraft(identity) ? "high" : "medium",
      status: "active",
      source: "ADS-B classification",
      title: isMilitaryAircraft(identity) ? "Military aircraft" : "Classified aircraft",
      description: `${label} is classified as ${aircraft.classification}.`,
      entityDomain: "aircraft",
      entityId: aircraft.id,
      entityLabel: label,
      occurredAt: aircraft.lastUpdated
    });
  }

  return alerts;
}

function toAircraftIdentity(aircraft: Aircraft): AircraftIdentity {
  return {
    ...(aircraft.aircraftType ? { aircraftType: aircraft.aircraftType } : {}),
    ...(aircraft.callsign ? { callsign: aircraft.callsign } : {}),
    ...(aircraft.category ? { category: aircraft.category } : {}),
    ...(aircraft.operator ? { operator: aircraft.operator } : {}),
    ...(aircraft.registration ? { registration: aircraft.registration } : {})
  };
}

function eventAlert(event: TrafficRuleEvent): AlertItem {
  return {
    id: `rule-${event.id}`,
    severity: event.eventType === "entered" ? "medium" : "low",
    status: "active",
    source: "Saved watch rule",
    title: event.eventType === "entered" ? "Entered watched area" : "Left watched area",
    description: `${event.entityLabel} ${event.eventType} ${event.ruleLabel}.`,
    entityDomain: event.entityDomain,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    occurredAt: event.occurredAt
  };
}

function anomalyAlert(anomaly: DetectedAnomaly): AlertItem {
  return {
    id: anomaly.id,
    severity: anomaly.severity,
    status: "active",
    source: anomaly.source,
    title: anomaly.title,
    description: anomaly.description,
    entityDomain: anomaly.entityDomain,
    entityId: anomaly.entityId,
    entityLabel: anomaly.entityLabel,
    occurredAt: anomaly.occurredAt
  };
}

function uniqueAlerts(alerts: AlertItem[]): AlertItem[] {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) {
      return false;
    }

    seen.add(alert.id);
    return true;
  });
}

function severityRank(severity: AlertSeverity): number {
  if (severity === "critical") {
    return 4;
  }

  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}

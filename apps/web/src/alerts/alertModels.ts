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
import { isContactStale } from "../traffic/feedConfidence";
import type { AlertPresetSettings } from "./alertPresets";
import { defaultAlertPresetSettings } from "./alertPresets";
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

export type AlertFeedHealth = {
  aircraftHealthIncidentStartedAt?: string;
  aircraftHealthReason?: string;
  aircraftHealthy: boolean;
  aircraftLastError?: string | null;
  aircraftLastMessageAt?: string;
  generatedAt: string;
  maxContactAgeMinutes: number;
  vesselHealthIncidentStartedAt?: string;
  vesselHealthReason?: string;
  vesselLastMessageAt?: string;
  vesselsHealthy: boolean;
  vesselLastError?: string | null;
};

export function buildAlertItems({
  acknowledged,
  aircraft,
  anomalies,
  dismissed,
  events,
  feedHealth,
  presets = defaultAlertPresetSettings,
  vessels
}: {
  acknowledged: Record<string, string>;
  aircraft: Aircraft[];
  anomalies: DetectedAnomaly[];
  dismissed: Record<string, string>;
  events: TrafficRuleEvent[];
  feedHealth?: AlertFeedHealth;
  presets?: AlertPresetSettings;
  vessels: Vessel[];
}): AlertItem[] {
  const alerts = [
    ...(presets.highRiskVessels || presets.classifiedVessels
      ? vessels.flatMap((vessel) => vesselAlerts(vessel, presets))
      : []),
    ...(presets.aircraftEmergencies || presets.classifiedAircraft
      ? aircraft.flatMap((item) => aircraftAlerts(item, presets))
      : []),
    ...(presets.watchRules ? events.slice(0, 25).map(eventAlert) : []),
    ...(presets.anomalies ? anomalies.map(anomalyAlert) : []),
    ...(presets.providerHealth && feedHealth ? providerHealthAlerts(feedHealth) : []),
    ...(presets.staleContacts && feedHealth
      ? staleContactAlerts(vessels, aircraft, feedHealth)
      : [])
  ];

  return uniqueAlerts(alerts)
    .map((alert) => ({
      ...alert,
      status: dismissed[alert.id] ? "dismissed" : acknowledged[alert.id] ? "acknowledged" : "active"
    }) satisfies AlertItem)
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
}

function vesselAlerts(vessel: Vessel, presets: AlertPresetSettings): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (presets.highRiskVessels && vessel.riskLevel === "high") {
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

  if (presets.classifiedVessels && isClassifiedVessel(vessel)) {
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

function aircraftAlerts(aircraft: Aircraft, presets: AlertPresetSettings): AlertItem[] {
  const label = aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
  const alerts: AlertItem[] = [];

  if (presets.aircraftEmergencies && aircraft.emergency) {
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

  if (
    presets.classifiedAircraft &&
    isClassifiedAircraft(identity) &&
    (isMilitaryAircraft(identity) || aircraft.riskLevel === "high")
  ) {
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

function providerHealthAlerts(feedHealth: AlertFeedHealth): AlertItem[] {
  return [
    feedHealth.vesselsHealthy
      ? null
      : providerAlert({
          domain: "vessel",
          error: feedHealth.vesselLastError,
          feedHealth,
          incidentStartedAt: feedHealth.vesselHealthIncidentStartedAt,
          lastMessageAt: feedHealth.vesselLastMessageAt,
          reason: feedHealth.vesselHealthReason,
          title: "Sea feed degraded"
        }),
    feedHealth.aircraftHealthy
      ? null
      : providerAlert({
          domain: "aircraft",
          error: feedHealth.aircraftLastError,
          feedHealth,
          incidentStartedAt: feedHealth.aircraftHealthIncidentStartedAt,
          lastMessageAt: feedHealth.aircraftLastMessageAt,
          reason: feedHealth.aircraftHealthReason,
          title: "Air feed degraded"
        })
  ].filter((alert): alert is AlertItem => alert !== null);
}

function providerAlert({
  domain,
  error,
  feedHealth,
  incidentStartedAt,
  lastMessageAt,
  reason,
  title
}: {
  domain: "vessel" | "aircraft";
  error: string | null | undefined;
  feedHealth: AlertFeedHealth;
  incidentStartedAt: string | undefined;
  lastMessageAt: string | undefined;
  reason: string | undefined;
  title: string;
}): AlertItem {
  const detail = error ?? reason ?? title;

  return {
    id: `provider-${domain}-health-${incidentHash([
      domain,
      detail,
      incidentStartedAt ?? "unknown-incident",
      lastMessageAt ?? "no-last-message"
    ])}`,
    severity: "high",
    status: "active",
    source: "Provider status",
    title,
    description: `${title}: ${detail}`,
    entityDomain: "area",
    occurredAt: feedHealth.generatedAt
  };
}

function staleContactAlerts(
  vessels: Vessel[],
  aircraft: Aircraft[],
  feedHealth: AlertFeedHealth
): AlertItem[] {
  const nowMs = Date.parse(feedHealth.generatedAt);
  const staleVessels = vessels.filter((vessel) =>
    isContactStale(vessel, feedHealth.maxContactAgeMinutes, nowMs)
  );
  const staleAircraft = aircraft.filter((item) =>
    isContactStale(item, feedHealth.maxContactAgeMinutes, nowMs)
  );

  return [
    staleVessels.length > 0 ? staleSummary("vessel", staleVessels, feedHealth) : null,
    staleAircraft.length > 0 ? staleSummary("aircraft", staleAircraft, feedHealth) : null
  ].filter((alert): alert is AlertItem => alert !== null);
}

function staleSummary(
  domain: "vessel" | "aircraft",
  contacts: Array<{ lastUpdated: string }>,
  feedHealth: AlertFeedHealth
): AlertItem {
  const label = domain === "vessel" ? "vessels" : "aircraft";
  const latestStaleUpdate = latestTimestamp(contacts);

  return {
    id: `provider-${domain}-stale-contacts-${incidentHash([
      domain,
      String(contacts.length),
      latestStaleUpdate,
      String(feedHealth.maxContactAgeMinutes)
    ])}`,
    severity: "medium",
    status: "active",
    source: "Feed confidence",
    title: `Stale ${label}`,
    description: `${contacts.length} ${label} have not updated within ${feedHealth.maxContactAgeMinutes} minutes.`,
    entityDomain: "area",
    occurredAt: feedHealth.generatedAt
  };
}

function latestTimestamp(contacts: Array<{ lastUpdated: string }>): string {
  const timestamps = contacts.map((contact) => contact.lastUpdated).sort();
  return timestamps[timestamps.length - 1] ?? "unknown";
}

function incidentHash(parts: string[]): string {
  const input = parts.join("|");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
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

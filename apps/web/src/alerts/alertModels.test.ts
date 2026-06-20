import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { defaultAlertPresetSettings } from "./alertPresets";
import { buildAlertItems } from "./alertModels";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-111000111",
  mmsi: "111000111",
  name: "WATCHED WARSHIP",
  shipType: "AIS type 35",
  longitude: 1,
  latitude: 50,
  speedOverGround: 12,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "high",
  lastUpdated: timestamp,
  track: []
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: 1,
  latitude: 50,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  emergency: true,
  onGround: false,
  classification: "military",
  riskLevel: "high",
  source: "mock",
  lastUpdated: timestamp,
  track: []
};

describe("buildAlertItems", () => {
  it("combines live risk and watch-rule events with persisted alert status", () => {
    const alerts = buildAlertItems({
      acknowledged: { [`vessel-${vessel.id}-high-risk`]: timestamp },
      dismissed: {},
      vessels: [vessel],
      aircraft: [],
      anomalies: [],
      events: [
        {
          id: "event-1",
          ruleId: "hormuz-all",
          ruleLabel: "All traffic in Strait of Hormuz",
          entityId: vessel.id,
          entityLabel: vessel.name,
          entityDomain: "vessel",
          eventType: "entered",
          occurredAt: timestamp
        }
      ]
    });

    expect(alerts.some((alert) => alert.source === "Saved watch rule")).toBe(true);
    expect(alerts.find((alert) => alert.id === `vessel-${vessel.id}-high-risk`)?.status).toBe("acknowledged");
  });

  it("uses presets to suppress disabled alert classes", () => {
    const alerts = buildAlertItems({
      acknowledged: {},
      aircraft: [aircraft],
      anomalies: [],
      dismissed: {},
      events: [],
      presets: {
        ...defaultAlertPresetSettings,
        aircraftEmergencies: false,
        classifiedAircraft: false,
        highRiskVessels: false
      },
      vessels: [vessel]
    });

    expect(alerts.some((alert) => alert.title === "Emergency aircraft")).toBe(false);
    expect(alerts.some((alert) => alert.title === "Military aircraft")).toBe(false);
    expect(alerts.some((alert) => alert.title === "High-risk vessel")).toBe(false);
  });

  it("adds provider health and stale-contact alerts from feed confidence data", () => {
    const alerts = buildAlertItems({
      acknowledged: {},
      aircraft: [
        {
          ...aircraft,
          emergency: false,
          lastUpdated: "2026-06-11T09:00:00.000Z"
        }
      ],
      anomalies: [],
      dismissed: {},
      events: [],
      feedHealth: {
        aircraftHealthIncidentStartedAt: "2026-06-11T09:55:00.000Z",
        aircraftHealthy: false,
        aircraftHealthReason: "Provider error: OpenSky returned HTTP 429",
        aircraftLastError: "OpenSky returned HTTP 429",
        aircraftLastMessageAt: "2026-06-11T09:55:00.000Z",
        generatedAt: timestamp,
        maxContactAgeMinutes: 10,
        vesselsHealthy: true,
        vesselLastError: null
      },
      presets: {
        ...defaultAlertPresetSettings,
        staleContacts: true
      },
      vessels: [vessel]
    });

    expect(alerts.find((alert) => alert.id.startsWith("provider-aircraft-health-"))?.description).toContain("HTTP 429");
    expect(alerts.find((alert) => alert.id.startsWith("provider-aircraft-stale-contacts-"))?.title).toBe("Stale aircraft");
  });

  it("scopes provider alert persistence to the incident fingerprint", () => {
    const firstAlerts = buildAlertItems({
      acknowledged: {},
      aircraft: [],
      anomalies: [],
      dismissed: {},
      events: [],
      feedHealth: {
        aircraftHealthIncidentStartedAt: "2026-06-11T09:48:00.000Z",
        aircraftHealthReason: "Last telemetry is 12 minutes old.",
        aircraftHealthy: false,
        aircraftLastMessageAt: "2026-06-11T09:48:00.000Z",
        generatedAt: timestamp,
        maxContactAgeMinutes: 10,
        vesselsHealthy: true
      },
      vessels: []
    });
    const oldIncidentId = firstAlerts.find((alert) =>
      alert.id.startsWith("provider-aircraft-health-")
    )?.id;

    expect(oldIncidentId).toBeTruthy();

    const nextAlerts = buildAlertItems({
      acknowledged: {},
      aircraft: [],
      anomalies: [],
      dismissed: { [oldIncidentId ?? "missing"]: timestamp },
      events: [],
      feedHealth: {
        aircraftHealthIncidentStartedAt: "2026-06-11T10:20:00.000Z",
        aircraftHealthReason: "Last telemetry is 12 minutes old.",
        aircraftHealthy: false,
        aircraftLastMessageAt: "2026-06-11T10:20:00.000Z",
        generatedAt: "2026-06-11T10:32:00.000Z",
        maxContactAgeMinutes: 10,
        vesselsHealthy: true
      },
      vessels: []
    });
    const nextIncident = nextAlerts.find((alert) =>
      alert.id.startsWith("provider-aircraft-health-")
    );

    expect(nextIncident?.id).not.toBe(oldIncidentId);
    expect(nextIncident?.status).toBe("active");
  });

  it("scopes no-telemetry provider alerts to the incident epoch", () => {
    const firstAlerts = buildAlertItems({
      acknowledged: {},
      aircraft: [],
      anomalies: [],
      dismissed: {},
      events: [],
      feedHealth: {
        aircraftHealthIncidentStartedAt: "2026-06-11T09:45:00.000Z",
        aircraftHealthReason: "No telemetry has been received yet.",
        aircraftHealthy: false,
        generatedAt: timestamp,
        maxContactAgeMinutes: 10,
        vesselsHealthy: true
      },
      vessels: []
    });
    const firstIncidentId = firstAlerts.find((alert) =>
      alert.id.startsWith("provider-aircraft-health-")
    )?.id;

    const laterAlerts = buildAlertItems({
      acknowledged: {},
      aircraft: [],
      anomalies: [],
      dismissed: { [firstIncidentId ?? "missing"]: timestamp },
      events: [],
      feedHealth: {
        aircraftHealthIncidentStartedAt: "2026-06-11T10:45:00.000Z",
        aircraftHealthReason: "No telemetry has been received yet.",
        aircraftHealthy: false,
        generatedAt: "2026-06-11T10:45:00.000Z",
        maxContactAgeMinutes: 10,
        vesselsHealthy: true
      },
      vessels: []
    });
    const laterIncident = laterAlerts.find((alert) =>
      alert.id.startsWith("provider-aircraft-health-")
    );

    expect(laterIncident?.id).not.toBe(firstIncidentId);
    expect(laterIncident?.status).toBe("active");
  });
});

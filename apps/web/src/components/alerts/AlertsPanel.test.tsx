import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, AisStreamStatus, FlightStreamStatus, Vessel } from "@aisstream/shared";
import { defaultAlertPresetSettings } from "../../alerts/alertPresets";
import { useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAnomalyStore } from "../../stores/anomalyStore";
import { useFeedFilterStore } from "../../stores/feedFilterStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { useVesselStore } from "../../stores/vesselStore";
import { AlertsPanel } from "./AlertsPanel";

const now = "2026-06-21T10:00:00.000Z";

describe("AlertsPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    window.localStorage.clear();
    resetStores();
  });

  it("renders generated alerts and supports inspect, acknowledge, dismiss, restore, and preset controls", () => {
    const onInspectAircraft = vi.fn();
    const onInspectVessel = vi.fn();

    render(
      <AlertsPanel
        aircraft={[emergencyAircraft, commercialAircraft]}
        vessels={[highRiskVessel]}
        onInspectAircraft={onInspectAircraft}
        onInspectVessel={onInspectVessel}
      />
    );

    expect(screen.getByText("High-risk vessel")).toBeTruthy();
    expect(screen.getByText("Emergency aircraft")).toBeTruthy();
    expect(screen.getByText("Entered watched area")).toBeTruthy();
    expect(screen.getByText("Fast vessel in watched area")).toBeTruthy();
    expect(screen.getByText("6 active")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Jump" })[0]!);
    expect(onInspectAircraft).toHaveBeenCalledWith(emergencyAircraft.id);

    fireEvent.click(screen.getAllByRole("button", { name: "Acknowledge" })[0]!);
    expect(Object.keys(useAlertStore.getState().acknowledged)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Ack" }));
    expect(screen.getByText(/Status: acknowledged/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]!);
    expect(Object.keys(useAlertStore.getState().dismissed)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "dismissed" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(useAlertStore.getState().dismissed).toEqual({});

    fireEvent.click(screen.getByLabelText(/High-risk vessels/));
    expect(useAlertStore.getState().presets.highRiskVessels).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useAlertStore.getState().presets.highRiskVessels).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "active" }));
    useAlertStore.getState().setPreset("highRiskVessels", false);
    useAlertStore.getState().setPreset("aircraftEmergencies", false);
    useAlertStore.getState().setPreset("classifiedAircraft", false);
    useAlertStore.getState().setPreset("watchRules", false);
    useAlertStore.getState().setPreset("anomalies", false);
    useAlertStore.getState().setPreset("providerHealth", false);
    useAlertStore.getState().setPreset("classifiedVessels", false);
    cleanup();
    render(
      <AlertsPanel
        aircraft={[commercialAircraft]}
        vessels={[]}
        onInspectAircraft={onInspectAircraft}
        onInspectVessel={onInspectVessel}
      />
    );

    expect(screen.getByText("No alerts in this view.")).toBeTruthy();
  });
});

function resetStores(): void {
  useAlertStore.setState({
    acknowledged: {},
    dismissed: {},
    presets: { ...defaultAlertPresetSettings },
    providerIncidents: {
      aircraft: { epoch: now, unhealthy: false },
      vessel: { epoch: now, unhealthy: false }
    }
  });
  useAircraftFilterStore.getState().resetFilters();
  useFeedFilterStore.getState().resetSettings();
  useAnomalyStore.setState({
    areaMonitors: [
      {
        id: "portsmouth",
        name: "Portsmouth",
        bounds: { south: 50.6, west: -1.4, north: 51, east: -0.8 },
        active: true,
        createdAt: now
      }
    ],
    entityMonitors: []
  });
  useTrafficRuleStore.setState({
    events: [
      {
        id: "portsmouth-entered",
        ruleId: "portsmouth-all",
        ruleLabel: "All traffic in Portsmouth",
        entityId: highRiskVessel.id,
        entityLabel: highRiskVessel.name,
        entityDomain: "vessel",
        eventType: "entered",
        occurredAt: now
      }
    ],
    rules: [],
    lastError: null
  });
  useVesselStore.setState({
    vessels: {},
    selectedVesselId: null,
    metrics: null,
    streamStatus: healthySeaStatus,
    connectionStatus: "open",
    lastError: null
  });
  useAircraftStore.setState({
    aircraft: {},
    selectedAircraftId: null,
    metrics: null,
    streamStatus: healthyAirStatus,
    connectionStatus: "open",
    lastError: null
  });
}

const highRiskVessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: -1.1,
  latitude: 50.8,
  speedOverGround: 55,
  courseOverGround: 86,
  destination: "Portsmouth",
  navigationalStatus: "Under way using engine",
  riskLevel: "high",
  lastUpdated: now,
  track: [{ longitude: -1.1, latitude: 50.8, timestamp: now }]
};

const emergencyAircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: -1.05,
  latitude: 50.75,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  emergency: true,
  onGround: false,
  classification: "military",
  riskLevel: "high",
  source: "opensky",
  lastUpdated: now,
  track: [{ longitude: -1.05, latitude: 50.75, altitudeFt: 18000, timestamp: now }]
};

const commercialAircraft: Aircraft = {
  ...emergencyAircraft,
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW123",
  aircraftType: "Airbus A320",
  operator: "British Airways",
  emergency: false,
  classification: "commercial",
  riskLevel: "low"
};

const healthySeaStatus: AisStreamStatus = {
  mode: "live",
  state: "subscribed",
  connected: true,
  messagesReceived: 10,
  messagesNormalised: 10,
  messagesDropped: 0,
  errors: 0,
  reconnectAttempts: 0,
  lastMessageAt: now,
  dataLatencyMs: 100,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]],
    filtersShipMMSI: [],
    filterMessageTypes: ["PositionReport"]
  }
};

const healthyAirStatus: FlightStreamStatus = {
  mode: "live",
  provider: "opensky",
  state: "subscribed",
  connected: true,
  aircraftReceived: 10,
  aircraftNormalised: 10,
  aircraftDropped: 0,
  errors: 0,
  reconnectAttempts: 0,
  lastMessageAt: now,
  dataLatencyMs: 100,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]]
  }
};

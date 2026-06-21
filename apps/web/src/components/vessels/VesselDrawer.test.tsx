import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, Vessel, VesselMetrics } from "@aisstream/shared";
import { questionForAnalysisMode } from "../analysis/analysisDefaults";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useAircraftIntelStore } from "../../stores/aircraftIntelStore";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useFeedFilterStore } from "../../stores/feedFilterStore";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useVesselIntelStore } from "../../stores/vesselIntelStore";
import { useVesselStore } from "../../stores/vesselStore";
import { VesselDrawer } from "./VesselDrawer";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};

const metrics: VesselMetrics = {
  liveVessels: 1,
  trackedVessels: 1,
  highRiskVessels: 0,
  averageSpeed: 12.5,
  dataLatencyMs: 100,
  lastUpdated: timestamp
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  originCountry: "United Kingdom",
  longitude: -1.75,
  latitude: 51.2,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "mock",
  lastUpdated: timestamp,
  track: [
    { longitude: -1.75, latitude: 51.2, altitudeFt: 18000, timestamp },
    { longitude: -1.65, latitude: 51.1, altitudeFt: 17500, timestamp }
  ]
};

function resetStores(): void {
  useVesselStore.setState({
    vessels: {},
    selectedVesselId: null,
    metrics: null,
    connectionStatus: "closed",
    lastError: null
  });
  useAircraftStore.setState({
    aircraft: {},
    selectedAircraftId: null,
    metrics: null,
    connectionStatus: "closed",
    lastError: null
  });
  useMapStore.setState({
    areaDraft: null,
    areaFocusRequest: null,
    areaOnlyMode: false,
    areaSelection: null,
    domainFilter: "all",
    focusRequest: null,
    isAreaDrawing: false,
    trackedTarget: null
  });
  useAnalysisStore.getState().reset();
  useFeedFilterStore.getState().resetSettings();
  useAirportContextStore.setState({
    areaStatus: "idle",
    areaResult: null,
    areaError: null,
    aircraftStatuses: {},
    aircraftResults: {},
    aircraftErrors: {},
    refreshArea: async () => undefined,
    refreshAircraft: async () => undefined
  });
  useAircraftIntelStore.setState({ errors: {}, results: {}, statuses: {} });
  useVesselIntelStore.setState({ errors: {}, results: {}, statuses: {} });
}

describe("VesselDrawer", () => {
  beforeEach(() => {
    cleanup();
    resetStores();
  });

  it("keeps area analysis available after a vessel is selected", async () => {
    useVesselStore.getState().setSnapshot([vessel], metrics);
    useVesselStore.getState().selectVessel(vessel.id);

    render(<VesselDrawer activePanel="overview" onPanelChange={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Area analysis" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vessel analysis" })).toBeTruthy();

    screen.getByRole("button", { name: "Area analysis" }).click();

    expect(await screen.findByRole("button", { name: "Draw box" })).toBeTruthy();
  });

  it("returns from a selected vessel to area analysis with the back arrow", async () => {
    const onPanelChange = vi.fn();
    useVesselStore.getState().setSnapshot([vessel], metrics);
    useMapStore.getState().completeAreaDrawing({
      bounds: {
        north: 50.86,
        east: -1.02,
        south: 50.75,
        west: -1.18
      }
    });
    useVesselStore.getState().selectVessel(vessel.id);

    render(<VesselDrawer activePanel="overview" onPanelChange={onPanelChange} />);

    screen.getByRole("button", { name: "Back to area analysis" }).click();

    expect(useVesselStore.getState().selectedVesselId).toBeNull();
    expect(useMapStore.getState().areaSelection?.name).toBe("Selected map area");
    expect(useAnalysisStore.getState().question).toBe(questionForAnalysisMode("area"));
    expect(onPanelChange).toHaveBeenCalledWith("overview");
    expect(await screen.findByText("No vessel selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Draw box" })).toBeTruthy();
    expect(screen.getByText(/Selected map area:/)).toBeTruthy();
  });

  it("starts live tracking when a route vessel is selected", async () => {
    const onPanelChange = vi.fn();
    const routedVessel: Vessel = {
      ...vessel,
      track: [
        { longitude: 1.2, latitude: 51.7, timestamp },
        { longitude: 1.3, latitude: 51.8, timestamp }
      ]
    };
    useVesselStore.getState().setSnapshot([routedVessel], metrics);

    render(<VesselDrawer activePanel="routes" onPanelChange={onPanelChange} />);

    screen.getByRole("button", { name: /NORTHERN LIGHT/ }).click();

    expect(useVesselStore.getState().selectedVesselId).toBe(vessel.id);
    expect(useMapStore.getState().trackedTarget).toMatchObject({
      domain: "vessel",
      follow: true,
      id: vessel.id
    });
    expect(useMapStore.getState().domainFilter).toBe("vessels");
    expect(onPanelChange).toHaveBeenCalledWith("routes");
  });

  it("keeps the route panel open when a route aircraft is selected", async () => {
    const onPanelChange = vi.fn();
    useAircraftStore.setState({
      aircraft: {
        [aircraft.id]: aircraft
      },
      selectedAircraftId: null,
      metrics: null,
      connectionStatus: "closed",
      lastError: null
    });

    render(<VesselDrawer activePanel="routes" onPanelChange={onPanelChange} />);

    screen.getByRole("button", { name: /RFR7182/ }).click();

    expect(useAircraftStore.getState().selectedAircraftId).toBe(aircraft.id);
    expect(useMapStore.getState().trackedTarget).toMatchObject({
      domain: "aircraft",
      follow: true,
      id: aircraft.id
    });
    expect(useMapStore.getState().domainFilter).toBe("aircraft");
    expect(onPanelChange).toHaveBeenCalledWith("routes");
  });

  it("uses feed confidence filters for the aircraft list", async () => {
    const freshAircraft: Aircraft = {
      ...aircraft,
      id: "icao24-40621b",
      icao24: "40621b",
      callsign: "BAW12",
      lastUpdated: new Date().toISOString()
    };
    const staleAircraft: Aircraft = {
      ...aircraft,
      id: "icao24-4d2222",
      icao24: "4d2222",
      callsign: "STALE1",
      lastUpdated: "2000-01-01T00:00:00.000Z"
    };
    useMapStore.setState({ domainFilter: "aircraft" });
    useFeedFilterStore.getState().setSetting("hideStaleContacts", true);
    useAircraftStore.setState({
      aircraft: {
        [freshAircraft.id]: freshAircraft,
        [staleAircraft.id]: staleAircraft
      },
      connectionStatus: "open",
      lastError: null,
      metrics: null,
      selectedAircraftId: null,
      streamStatus: {
        aircraftDropped: 0,
        aircraftNormalised: 2,
        aircraftReceived: 2,
        connected: true,
        errors: 0,
        lastMessageAt: freshAircraft.lastUpdated,
        mode: "live",
        provider: "opensky",
        reconnectAttempts: 0,
        state: "subscribed",
        subscription: {
          boundingBoxes: [[[-90, -180], [90, 180]]]
        }
      }
    });

    render(<VesselDrawer activePanel="overview" onPanelChange={vi.fn()} />);

    expect(await screen.findByText("BAW12")).toBeTruthy();
    expect(screen.queryByText("STALE1")).toBeNull();
  });
});

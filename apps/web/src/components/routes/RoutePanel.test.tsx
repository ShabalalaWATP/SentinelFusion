import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, Vessel, VesselMetrics } from "@aisstream/shared";
import { useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { useVesselStore } from "../../stores/vesselStore";
import { RoutePanel } from "./RoutePanel";

const timestamp = "2026-06-11T10:00:00.000Z";

const routeVessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "FAST ROUTE",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [
    { longitude: 1.2, latitude: 51.7, timestamp },
    { longitude: 1.3, latitude: 51.8, timestamp }
  ]
};

const singlePointVessel: Vessel = {
  ...routeVessel,
  id: "mmsi-232001245",
  mmsi: "232001245",
  name: "SINGLE POINT",
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};

const metrics: VesselMetrics = {
  liveVessels: 2,
  trackedVessels: 2,
  highRiskVessels: 0,
  averageSpeed: 8,
  dataLatencyMs: 100,
  lastUpdated: timestamp
};

const militaryAircraft: Aircraft = {
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

const commercialAircraft: Aircraft = {
  ...militaryAircraft,
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW12",
  aircraftType: "Airbus A320",
  operator: "British Airways",
  classification: "commercial",
  riskLevel: "low"
};

describe("RoutePanel", () => {
  beforeEach(() => {
    useVesselStore.setState({
      vessels: {},
      selectedVesselId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useAircraftStore.setState({
      aircraft: {},
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useAircraftFilterStore.getState().resetFilters();
    useMapStore.setState({
      areaDraft: null,
      areaFocusRequest: null,
      areaOnlyMode: false,
      areaSelection: null,
      domainFilter: "all",
      isAreaDrawing: false
    });
    useTrafficRuleStore.setState({ events: [], lastError: null, rules: [] });
  });

  it("shows only vessels with route lines and highlights the selected route", () => {
    useVesselStore.getState().setSnapshot([routeVessel, singlePointVessel], metrics);
    useVesselStore.getState().selectVessel(routeVessel.id);

    render(<RoutePanel onInspectAircraft={vi.fn()} onInspectVessel={vi.fn()} />);

    const text = document.body.textContent ?? "";
    const routeButton = document.querySelector("aside button");

    expect(text).toContain("Observed tracks");
    expect(text).toContain("Rebuilt from received AIS and flight positions.");
    expect(text).toContain("FAST ROUTE");
    expect(text).not.toContain("SINGLE POINT");
    expect(routeButton?.className).toContain("amber");
  });

  it("uses aircraft filters for observed flight tracks", () => {
    useAircraftStore.setState({
      aircraft: {
        [militaryAircraft.id]: militaryAircraft,
        [commercialAircraft.id]: commercialAircraft
      },
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useAircraftFilterStore.getState().toggleClassification("military");

    render(<RoutePanel onInspectAircraft={vi.fn()} onInspectVessel={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).toContain("Observed flight tracks");
    expect(text).toContain("RFR7182");
    expect(text).not.toContain("BAW12");
  });

  it("uses the same domain filter as the map", () => {
    useVesselStore.getState().setSnapshot([routeVessel], metrics);
    useAircraftStore.setState({
      aircraft: {
        [militaryAircraft.id]: militaryAircraft
      },
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useMapStore.getState().setDomainFilter("aircraft");

    render(<RoutePanel onInspectAircraft={vi.fn()} onInspectVessel={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("FAST ROUTE");
    expect(text).toContain("RFR7182");
  });

  it("uses the capped flight route set for panel counts and rows", () => {
    const aircraftRoutes = Object.fromEntries(
      Array.from({ length: 41 }, (_, index) => {
        const item = makeTrackedAircraft(index);
        return [item.id, item];
      })
    );
    useAircraftStore.setState({
      aircraft: aircraftRoutes,
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });

    render(<RoutePanel onInspectAircraft={vi.fn()} onInspectVessel={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).toContain("Observed flight tracks40");
    expect(text).toContain("FLT39");
    expect(text).not.toContain("FLT40");
  });
});

function makeTrackedAircraft(index: number): Aircraft {
  const id = `icao24-${index.toString().padStart(2, "0")}`;

  return {
    ...commercialAircraft,
    id,
    icao24: index.toString(16).padStart(6, "0"),
    callsign: `FLT${index.toString().padStart(2, "0")}`,
    groundSpeedKt: 1_000 - index,
    track: [
      { longitude: -1.75, latitude: 51.2, altitudeFt: 18000, timestamp },
      {
        longitude: -1.65,
        latitude: 51.1,
        altitudeFt: 17500,
        timestamp
      }
    ]
  };
}

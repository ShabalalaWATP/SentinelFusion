import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { useVesselStore } from "../../stores/vesselStore";
import * as areaOverlay from "./areaOverlay";
import { MapCanvas } from "./MapCanvas";
import * as mapCanvasUtils from "./mapCanvasUtils";
import * as mapSync from "./mapCanvasSync";
import * as interactions from "./mapInteractionHandlers";

const timestamp = "2026-06-21T10:00:00.000Z";
const area = {
  id: "portsmouth",
  name: "Portsmouth",
  bounds: { south: 50.6, west: -1.4, north: 51, east: -0.8 }
};

const maplibreMock = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];

    readonly addControl = vi.fn();
    readonly easeTo = vi.fn();
    readonly flyTo = vi.fn();
    readonly getCanvas = vi.fn(() => this.canvas);
    readonly getZoom = vi.fn(() => 3);
    readonly isStyleLoaded = vi.fn(() => true);
    readonly on = vi.fn((event: string, handler: () => void) => {
      this.handlers[event] = [...(this.handlers[event] ?? []), handler];
    });
    readonly once = vi.fn((event: string, handler: () => void) => {
      this.onceHandlers[event] = [...(this.onceHandlers[event] ?? []), handler];
    });
    readonly remove = vi.fn();
    readonly setStyle = vi.fn();
    readonly canvas = { style: { cursor: "" } };
    readonly handlers: Record<string, Array<() => void>> = {};
    readonly onceHandlers: Record<string, Array<() => void>> = {};

    constructor(readonly options: unknown) {
      FakeMap.instances.push(this);
    }

    trigger(event: string): void {
      for (const handler of this.handlers[event] ?? []) {
        handler();
      }
      const onceHandlers = this.onceHandlers[event] ?? [];
      this.onceHandlers[event] = [];
      for (const handler of onceHandlers) {
        handler();
      }
    }
  }

  return {
    AttributionControl: vi.fn(),
    FakeMap,
    NavigationControl: vi.fn()
  };
});

vi.mock("maplibre-gl", () => ({
  default: {
    AttributionControl: maplibreMock.AttributionControl,
    Map: maplibreMock.FakeMap,
    NavigationControl: maplibreMock.NavigationControl
  }
}));

vi.mock("./areaOverlay", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    fitMapToArea: vi.fn(),
    updateAreaSource: vi.fn()
  };
});

vi.mock("./mapCanvasSync", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    syncAirportContextLayer: vi.fn(),
    syncConflictContextLayer: vi.fn(),
    syncFireAnomalyLayer: vi.fn(),
    syncIntelligenceLayers: vi.fn(),
    syncMapCanvasState: vi.fn(),
    syncTrafficSources: vi.fn()
  };
});

vi.mock("./mapCanvasUtils", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    applyProjection: vi.fn()
  };
});

vi.mock("./mapInteractionHandlers", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    registerMapInteractionHandlers: vi.fn()
  };
});

describe("MapCanvas", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    maplibreMock.FakeMap.instances = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("initialises MapLibre, syncs layers, follows selected traffic, handles area state, and removes the map", () => {
    const { unmount } = render(<MapCanvas showRoutes={false} />);
    const map = maplibreMock.FakeMap.instances[0]!;

    expect(screen.getByLabelText("Traffic map")).toBeTruthy();
    expect(screen.getByText("Server AIS and flight feeds")).toBeTruthy();
    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(interactions.registerMapInteractionHandlers).toHaveBeenCalled();

    act(() => {
      map.trigger("load");
    });
    expect(mapSync.syncMapCanvasState).toHaveBeenCalledWith(map, expect.any(Object));

    act(() => {
      useMapStore.getState().setStyleId("light");
    });
    expect(map.setStyle).toHaveBeenCalledWith(expect.any(String), { diff: false });

    act(() => {
      map.trigger("styledata");
    });
    expect(mapSync.syncMapCanvasState).toHaveBeenCalledTimes(2);

    act(() => {
      useMapStore.getState().toggleIntelligenceLayer("airports");
    });
    expect(mapSync.syncIntelligenceLayers).toHaveBeenCalled();

    act(() => {
      useMapStore.getState().setProjection("globe");
    });
    expect(mapCanvasUtils.applyProjection).toHaveBeenCalledWith(map, "globe");

    act(() => {
      useMapStore.getState().focusVessel(vessel, { zoom: 14 });
    });
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [vessel.longitude, vessel.latitude],
        zoom: 14
      })
    );

    act(() => {
      useMapStore.getState().startTrackingAircraft(aircraft, { follow: true, zoom: 8 });
    });
    expect(map.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [aircraft.longitude, aircraft.latitude],
        zoom: 8
      })
    );

    act(() => {
      useMapStore.getState().focusArea(area);
    });
    expect(areaOverlay.updateAreaSource).toHaveBeenCalledWith(
      map,
      expect.objectContaining({ id: area.id })
    );
    expect(areaOverlay.fitMapToArea).toHaveBeenCalledWith(
      map,
      expect.objectContaining({ id: area.id })
    );

    act(() => {
      useMapStore.getState().startAreaDrawing();
    });
    expect(map.canvas.style.cursor).toBe("crosshair");

    unmount();

    expect(map.remove).toHaveBeenCalled();
  });
});

function resetStores(): void {
  useVesselStore.setState({
    vessels: { [vessel.id]: vessel },
    selectedVesselId: null,
    metrics: null,
    streamStatus: null,
    connectionStatus: "closed",
    lastError: null
  });
  useAircraftStore.setState({
    aircraft: { [aircraft.id]: aircraft },
    selectedAircraftId: null,
    metrics: null,
    streamStatus: null,
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
    intelligenceLayers: {
      airports: false,
      chokepoints: true,
      "conflict-events": false,
      "fire-anomalies": false,
      "maritime-zones": false,
      ports: true,
      "risk-zones": true,
      "shipping-lanes": true
    },
    isAreaDrawing: false,
    projection: "mercator",
    styleId: "dark",
    trackedTarget: null
  });
  useTrafficRuleStore.setState({
    rules: [],
    events: [],
    lastError: null
  });
}

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: -1.1,
  latitude: 50.8,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [
    { longitude: -1.2, latitude: 50.7, timestamp },
    { longitude: -1.1, latitude: 50.8, timestamp }
  ]
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  longitude: -1.05,
  latitude: 50.75,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "opensky",
  lastUpdated: timestamp,
  track: [
    { longitude: -1.15, latitude: 50.72, altitudeFt: 17500, timestamp },
    { longitude: -1.05, latitude: 50.75, altitudeFt: 18000, timestamp }
  ]
};

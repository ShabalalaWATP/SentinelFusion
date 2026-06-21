import { describe, expect, it } from "vitest";
import { useMapStore } from "./mapStore";

describe("mapStore", () => {
  it("sets and clears area focus requests", () => {
    useMapStore.setState({
      areaDraft: null,
      areaFocusRequest: null,
      areaSelection: null,
      areaOnlyMode: false,
      domainFilter: "all",
      focusRequest: null,
      isAreaDrawing: false
    });

    useMapStore.getState().focusArea({
      id: "portsmouth",
      name: "Portsmouth",
      bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 }
    });

    expect(useMapStore.getState().areaFocusRequest).toMatchObject({
      id: "portsmouth",
      name: "Portsmouth"
    });

    useMapStore.getState().clearAreaFocus();

    expect(useMapStore.getState().areaFocusRequest).toBeNull();
  });

  it("sets close vessel focus requests", () => {
    useMapStore.setState({ areaFocusRequest: null, focusRequest: null });

    useMapStore.getState().focusVessel({
      id: "mmsi-232001234",
      longitude: -1.09,
      latitude: 50.8
    });

    expect(useMapStore.getState().focusRequest).toMatchObject({
      id: "mmsi-232001234",
      domain: "vessel",
      longitude: -1.09,
      latitude: 50.8,
      zoom: 15
    });
  });

  it("sets aircraft focus requests and domain filters", () => {
    useMapStore.setState({ domainFilter: "all", focusRequest: null });

    useMapStore.getState().setDomainFilter("aircraft");
    useMapStore.getState().focusAircraft({
      id: "icao24-43c6f1",
      longitude: -1.75,
      latitude: 51.2
    });

    expect(useMapStore.getState().domainFilter).toBe("aircraft");
    expect(useMapStore.getState().focusRequest).toMatchObject({
      id: "icao24-43c6f1",
      domain: "aircraft",
      longitude: -1.75,
      latitude: 51.2,
      zoom: 11.5
    });
  });

  it("tracks drawn map area selection lifecycle", () => {
    useMapStore.setState({
      areaDraft: null,
      areaFocusRequest: null,
      areaSelection: null,
      isAreaDrawing: false
    });

    useMapStore.getState().startAreaDrawing();
    useMapStore.getState().updateAreaDraft({
      bounds: { south: 50.7, west: -1.2, north: 50.9, east: -1.0 }
    });

    expect(useMapStore.getState().isAreaDrawing).toBe(true);
    expect(useMapStore.getState().areaDraft?.name).toBe("Area draft");

    useMapStore.getState().completeAreaDrawing({
      bounds: { south: 50.7, west: -1.2, north: 50.9, east: -1.0 }
    });

    expect(useMapStore.getState().isAreaDrawing).toBe(false);
    expect(useMapStore.getState().areaDraft).toBeNull();
    expect(useMapStore.getState().areaSelection).toMatchObject({
      id: "selected-map-area",
      name: "Selected map area"
    });

    useMapStore.getState().clearAreaSelection();

    expect(useMapStore.getState().areaSelection).toBeNull();
  });

  it("selects saved operational areas and toggles area-only mode", () => {
    useMapStore.setState({
      areaFocusRequest: null,
      areaOnlyMode: false,
      areaSelection: null
    });

    useMapStore.getState().selectOperationalArea({
      id: "hormuz",
      name: "Strait of Hormuz",
      bounds: { south: 25.35, west: 55.05, north: 27.25, east: 57.35 }
    });
    useMapStore.getState().setAreaOnlyMode(true);

    expect(useMapStore.getState().areaSelection).toMatchObject({
      id: "hormuz",
      name: "Strait of Hormuz"
    });
    expect(useMapStore.getState().areaFocusRequest?.id).toBe("hormuz");
    expect(useMapStore.getState().areaOnlyMode).toBe(true);
  });

  it("tracks and follows selected vessels or aircraft", () => {
    useMapStore.setState({ focusRequest: null, trackedTarget: null });

    useMapStore.getState().startTrackingAircraft(
      {
        id: "icao24-43c6f1",
        longitude: -1.75,
        latitude: 51.2
      },
      { follow: true }
    );

    expect(useMapStore.getState().trackedTarget).toMatchObject({
      id: "icao24-43c6f1",
      domain: "aircraft",
      follow: true
    });
    expect(useMapStore.getState().focusRequest?.zoom).toBe(11.5);

    useMapStore.getState().stopTracking();

    expect(useMapStore.getState().trackedTarget).toBeNull();
  });

  it("toggles map intelligence layers", () => {
    useMapStore.setState({
      intelligenceLayers: {
        airports: false,
        chokepoints: true,
        "conflict-events": false,
        "fire-anomalies": false,
        "maritime-zones": false,
        ports: true,
        "risk-zones": true,
        "shipping-lanes": true
      }
    });

    useMapStore.getState().toggleIntelligenceLayer("airports");
    useMapStore.getState().setIntelligenceLayer("fire-anomalies", true);

    expect(useMapStore.getState().intelligenceLayers.airports).toBe(true);
    expect(useMapStore.getState().intelligenceLayers["fire-anomalies"]).toBe(true);
  });
});

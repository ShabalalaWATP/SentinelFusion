import type { FeatureCollection, Geometry, LineString, Point } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAircraftLayers, updateAircraftSources } from "./aircraftLayers";
import { ensureAreaLayers, fitMapToArea, updateAreaSource } from "./areaOverlay";
import { applyProjection, isMeaningfulBounds, toBounds } from "./mapCanvasUtils";
import {
  syncAirportContextLayer,
  syncConflictContextLayer,
  syncFireAnomalyLayer,
  syncIntelligenceLayers,
  syncMapCanvasState,
  syncTrafficSources,
  type MapCanvasSyncState
} from "./mapCanvasSync";
import { ensureIntelligenceLayers, updateIntelligenceLayerVisibility } from "./mapIntelligenceLayers";
import { ensureVesselLayers, updateVesselSources } from "./vesselLayers";

describe("map layer synchronisation", () => {
  let createElementSpy: { mockRestore(): void };
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName !== "canvas") {
        return originalCreateElement(tagName);
      }

      return fakeCanvas() as unknown as HTMLElement;
    });
    vi.stubGlobal(
      "ImageData",
      class {
        readonly data: Uint8ClampedArray;
        constructor(
          public readonly width: number,
          public readonly height: number
        ) {
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      }
    );
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("creates traffic, intelligence, context, and area layers then updates every source", () => {
    const map = createFakeMap();
    const state = syncState();

    syncMapCanvasState(map as never, state);
    syncMapCanvasState(map as never, state);

    expect(map.imageIds()).toEqual([
      "ship-low",
      "ship-medium",
      "ship-high",
      "ship-military",
      "ship-government",
      "aircraft-commercial",
      "aircraft-private",
      "aircraft-emergency",
      "aircraft-military",
      "aircraft-government",
      "aircraft-unknown"
    ]);
    expect(map.sourceIds()).toEqual(
      expect.arrayContaining([
        "analysis-area",
        "aircraft",
        "aircraft-track-markers",
        "aircraft-tracks",
        "airport-context-airports",
        "conflict-context-events",
        "firms-fire-anomalies",
        "intel-airports",
        "intel-chokepoints",
        "intel-maritime-zones",
        "intel-ports",
        "intel-risk-zones",
        "intel-shipping-lanes",
        "vessel-track-markers",
        "vessel-tracks",
        "vessels"
      ])
    );
    expect(map.layerIds()).toEqual(
      expect.arrayContaining([
        "aircraft-points",
        "airport-context-airports-circle",
        "conflict-context-events-circle",
        "firms-fire-anomalies-circle",
        "intel-ports-label",
        "vessel-points",
        "vessel-selection-halo"
      ])
    );
    expect(map.getSetDataCalls("vessels").at(-1)).toBe(state.pointData);
    expect(map.getSetDataCalls("aircraft").at(-1)).toBe(state.aircraftPointData);
    expect(map.getSetDataCalls("analysis-area").at(-1)).toMatchObject({
      features: [{ properties: { id: "portsmouth", name: "Portsmouth" } }]
    });
    expect(map.layoutProperties()).toEqual(
      expect.arrayContaining([
        ["intel-airports-circle", "visibility", "visible"],
        ["conflict-context-events-circle", "visibility", "none"],
        ["firms-fire-anomalies-circle", "visibility", "visible"]
      ])
    );
    expect(map.projections()).toEqual([{ type: "globe" }, { type: "globe" }]);
    expect(map.addedLayerCount("vessel-points")).toBe(1);
    expect(map.addedSourceCount("vessels")).toBe(1);
  });

  it("supports targeted sync helpers and MapLibre projection fallback", () => {
    const map = createFakeMap({ projectionFailures: 1 });
    const state = syncState({
      intelligenceLayers: {
        airports: false,
        chokepoints: false,
        "conflict-events": true,
        "fire-anomalies": false,
        "maritime-zones": true,
        ports: true,
        "risk-zones": false,
        "shipping-lanes": true
      }
    });

    syncTrafficSources(map as never, state);
    syncIntelligenceLayers(map as never, state);
    syncAirportContextLayer(map as never, state);
    syncConflictContextLayer(map as never, state);
    syncFireAnomalyLayer(map as never, state);
    applyProjection(map as never, "globe");

    expect(map.layoutProperties()).toEqual(
      expect.arrayContaining([
        ["intel-ports-circle", "visibility", "visible"],
        ["intel-risk-zones-fill", "visibility", "none"],
        ["airport-context-airports-circle", "visibility", "none"],
        ["conflict-context-events-circle", "visibility", "visible"],
        ["firms-fire-anomalies-circle", "visibility", "none"]
      ])
    );
    expect(map.projections()).toEqual([{ type: "globe" }, { type: "mercator" }]);
  });

  it("updates individual layer sources and area map bounds", () => {
    const map = createFakeMap();
    const state = syncState();

    ensureVesselLayers(map as never);
    updateVesselSources(map as never, state.pointData, state.trackData, state.trackMarkerData);
    ensureAircraftLayers(map as never);
    updateAircraftSources(
      map as never,
      state.aircraftPointData,
      state.aircraftTrackData,
      state.aircraftTrackMarkerData
    );
    ensureAreaLayers(map as never);
    updateAreaSource(map as never, null);
    updateAreaSource(map as never, state.areaOverlay);
    ensureIntelligenceLayers(map as never);
    updateIntelligenceLayerVisibility(map as never, state.intelligenceLayers);
    fitMapToArea(map as never, state.areaOverlay!);

    expect(map.getSetDataCalls("analysis-area")[0]).toEqual({ type: "FeatureCollection", features: [] });
    expect(map.fitBoundsCalls()).toEqual([
      [
        [
          [-1.28, 50.68],
          [-0.86, 50.9]
        ],
        { duration: 900, essential: true, maxZoom: 11, padding: 72 }
      ]
    ]);
  });

  it("normalises map selection bounds and ignores projection calls before style load", () => {
    const unloadedMap = createFakeMap({ styleLoaded: false });

    expect(toBounds({ lat: 95, lng: -200 }, { lat: 50, lng: 190 })).toEqual({
      south: 50,
      west: -180,
      north: 90,
      east: 180
    });
    expect(isMeaningfulBounds({ south: 1, west: 2, north: 1.0005, east: 2.5 })).toBe(false);
    expect(isMeaningfulBounds({ south: 1, west: 2, north: 1.5, east: 2.5 })).toBe(true);
    applyProjection(unloadedMap as never, "globe");
    expect(unloadedMap.projections()).toEqual([]);
  });
});

function syncState(overrides: Partial<MapCanvasSyncState> = {}): MapCanvasSyncState {
  return {
    aircraftPointData: collection<Point>(),
    aircraftTrackData: collection<LineString>(),
    aircraftTrackMarkerData: collection<Point>(),
    airportContextData: collection<Point>(),
    areaOverlay: {
      id: "portsmouth",
      name: "Portsmouth",
      requestedAt: 1,
      bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 }
    },
    conflictContextData: collection<Point>(),
    fireAnomalyData: collection<Point>(),
    intelligenceLayers: {
      airports: true,
      chokepoints: false,
      "conflict-events": false,
      "fire-anomalies": true,
      "maritime-zones": false,
      ports: true,
      "risk-zones": true,
      "shipping-lanes": false
    },
    pointData: collection<Point>(),
    projection: "globe",
    trackData: collection<LineString>(),
    trackMarkerData: collection<Point>(),
    ...overrides
  };
}

function collection<T extends Geometry = Geometry>(): FeatureCollection<T> {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function fakeCanvas(): Partial<HTMLCanvasElement> {
  const context = {
    arcTo: vi.fn(),
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    getImageData: vi.fn(() => new ImageData(8, 8)),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn()
  };

  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context) as unknown as HTMLCanvasElement["getContext"]
  };
}

function createFakeMap(options: { projectionFailures?: number; styleLoaded?: boolean } = {}) {
  const sources = new Map<string, { data: unknown; setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, unknown>();
  const images = new Map<string, unknown>();
  const sourceAdds: string[] = [];
  const layerAdds: string[] = [];
  const layoutCalls: Array<[string, string, unknown]> = [];
  const projectionCalls: Array<{ type: string }> = [];
  const fitBounds = vi.fn();
  let projectionFailures = options.projectionFailures ?? 0;

  return {
    addImage: vi.fn((id: string, image: unknown) => {
      images.set(id, image);
    }),
    addLayer: vi.fn((layer: { id: string }) => {
      layerAdds.push(layer.id);
      layers.set(layer.id, layer);
    }),
    addSource: vi.fn((id: string, source: { data?: unknown }) => {
      sourceAdds.push(id);
      sources.set(id, {
        data: source.data,
        setData: vi.fn((data: unknown) => {
          sources.get(id)!.data = data;
        })
      });
    }),
    addedLayerCount(id: string) {
      return layerAdds.filter((layerId) => layerId === id).length;
    },
    addedSourceCount(id: string) {
      return sourceAdds.filter((sourceId) => sourceId === id).length;
    },
    fitBounds,
    fitBoundsCalls() {
      return fitBounds.mock.calls;
    },
    getLayer: vi.fn((id: string) => layers.get(id)),
    getSetDataCalls(id: string) {
      return sources.get(id)?.setData.mock.calls.map(([data]) => data) ?? [];
    },
    getSource: vi.fn((id: string) => sources.get(id)),
    hasImage: vi.fn((id: string) => images.has(id)),
    imageIds() {
      return [...images.keys()];
    },
    isStyleLoaded: vi.fn(() => options.styleLoaded ?? true),
    layerIds() {
      return [...layers.keys()];
    },
    layoutProperties() {
      return layoutCalls;
    },
    projections() {
      return projectionCalls;
    },
    setLayoutProperty: vi.fn((layerId: string, property: string, value: unknown) => {
      layoutCalls.push([layerId, property, value]);
    }),
    setProjection: vi.fn((projection: { type: string }) => {
      projectionCalls.push(projection);
      if (projectionFailures > 0) {
        projectionFailures -= 1;
        throw new Error("projection unsupported");
      }
    }),
    sourceIds() {
      return [...sources.keys()];
    }
  };
}

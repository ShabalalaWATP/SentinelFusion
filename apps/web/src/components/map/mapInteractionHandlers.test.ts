import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { registerMapInteractionHandlers } from "./mapInteractionHandlers";

type FakeMapEvent = {
  features?: Array<{ properties?: { id?: unknown } }>;
  lngLat?: { lng: number; lat: number };
  originalEvent?: { button: number };
  preventDefault?: () => void;
};
type Handler = (event: FakeMapEvent) => void;

class FakeMap {
  readonly canvas = { style: { cursor: "" } };
  readonly dragPan = {
    disable: vi.fn(),
    enable: vi.fn()
  };
  private readonly handlers: Record<string, Handler[]> = {};

  on(type: string, layerOrHandler: string | Handler, maybeHandler?: Handler): void {
    const key = typeof layerOrHandler === "string" ? `${type}:${layerOrHandler}` : type;
    const handler = typeof layerOrHandler === "string" ? maybeHandler : layerOrHandler;
    this.handlers[key] = [...(this.handlers[key] ?? []), handler!];
  }

  getCanvas(): { style: { cursor: string } } {
    return this.canvas;
  }

  trigger(key: string, event: FakeMapEvent = {}): void {
    for (const handler of this.handlers[key] ?? []) {
      handler(event);
    }
  }
}

describe("registerMapInteractionHandlers", () => {
  it("selects and tracks clicked vessels and aircraft unless drawing is active", () => {
    const map = new FakeMap();
    const refs = interactionRefs();
    registerMapInteractionHandlers(map as unknown as MapLibreMap, refs);

    map.trigger("click:vessel-points", {
      features: [{ properties: { id: "mmsi-232001234" } }],
      lngLat: { lng: -1.1, lat: 50.8 }
    });
    map.trigger("click:aircraft-points", {
      features: [{ properties: { id: "icao24-43c6f1" } }],
      lngLat: { lng: -1.2, lat: 50.9 }
    });

    expect(refs.selectVesselRef.current).toHaveBeenNthCalledWith(1, "mmsi-232001234");
    expect(refs.selectAircraftRef.current).toHaveBeenNthCalledWith(1, null);
    expect(refs.startTrackingVesselRef.current).toHaveBeenCalledWith(
      { id: "mmsi-232001234", longitude: -1.1, latitude: 50.8 },
      { follow: false }
    );
    expect(refs.selectAircraftRef.current).toHaveBeenNthCalledWith(2, "icao24-43c6f1");
    expect(refs.selectVesselRef.current).toHaveBeenNthCalledWith(2, null);
    expect(refs.startTrackingAircraftRef.current).toHaveBeenCalledWith(
      { id: "icao24-43c6f1", longitude: -1.2, latitude: 50.9 },
      { follow: false }
    );

    refs.isAreaDrawingRef.current = true;
    map.trigger("click:vessel-points", {
      features: [{ properties: { id: "mmsi-ignored" } }],
      lngLat: { lng: 0, lat: 0 }
    });

    expect(refs.selectVesselRef.current).not.toHaveBeenCalledWith("mmsi-ignored");
  });

  it("draws meaningful area selections and restores pan/cursor state", () => {
    const map = new FakeMap();
    const refs = interactionRefs();
    refs.isAreaDrawingRef.current = true;
    registerMapInteractionHandlers(map as unknown as MapLibreMap, refs);

    const preventDefault = vi.fn();
    map.trigger("mousedown", {
      originalEvent: { button: 0 },
      lngLat: { lng: -1.28, lat: 50.68 },
      preventDefault
    });
    map.trigger("mousemove", {
      lngLat: { lng: -0.86, lat: 50.9 }
    });
    map.trigger("mouseup", {
      lngLat: { lng: -0.86, lat: 50.9 }
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(map.dragPan.disable).toHaveBeenCalled();
    expect(map.dragPan.enable).toHaveBeenCalled();
    expect(refs.updateAreaDraftRef.current).toHaveBeenCalledWith({
      bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 }
    });
    expect(refs.completeAreaDrawingRef.current).toHaveBeenCalledWith({
      bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 }
    });
    expect(refs.drawStartRef.current).toBeNull();
    expect(map.getCanvas().style.cursor).toBe("");
  });

  it("uses pointer cursor while hovering traffic layers", () => {
    const map = new FakeMap();
    const refs = interactionRefs();
    registerMapInteractionHandlers(map as unknown as MapLibreMap, refs);

    map.trigger("mouseenter:vessel-points");
    expect(map.getCanvas().style.cursor).toBe("pointer");

    map.trigger("mouseleave:vessel-points");
    expect(map.getCanvas().style.cursor).toBe("");
  });
});

function interactionRefs() {
  return {
    completeAreaDrawingRef: { current: vi.fn() },
    drawStartRef: { current: null },
    isAreaDrawingRef: { current: false },
    selectAircraftRef: { current: vi.fn() },
    selectVesselRef: { current: vi.fn() },
    startTrackingAircraftRef: { current: vi.fn() },
    startTrackingVesselRef: { current: vi.fn() },
    updateAreaDraftRef: { current: vi.fn() }
  };
}

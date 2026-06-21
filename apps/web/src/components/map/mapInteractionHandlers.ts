import type { TrafficAreaBounds } from "@aisstream/shared";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MutableRefObject } from "react";
import { isMeaningfulBounds, toBounds } from "./mapCanvasUtils";

type EntityTarget = { id: string; longitude: number; latitude: number };
type SelectionRef = MutableRefObject<(id: string | null) => void>;
type TrackingRef = MutableRefObject<(target: EntityTarget, options?: { follow?: boolean; zoom?: number }) => void>;
type AreaRef = MutableRefObject<(area: { bounds: TrafficAreaBounds }) => void>;
type DrawStartRef = MutableRefObject<{ lat: number; lng: number } | null>;

type MapInteractionRefs = {
  completeAreaDrawingRef: AreaRef;
  drawStartRef: DrawStartRef;
  isAreaDrawingRef: MutableRefObject<boolean>;
  selectAircraftRef: SelectionRef;
  selectVesselRef: SelectionRef;
  startTrackingAircraftRef: TrackingRef;
  startTrackingVesselRef: TrackingRef;
  updateAreaDraftRef: AreaRef;
};

export function registerMapInteractionHandlers(map: MapLibreMap, refs: MapInteractionRefs): void {
  map.on("click", "vessel-points", (event) => {
    if (refs.isAreaDrawingRef.current) {
      return;
    }

    const id = event.features?.[0]?.properties?.id;
    if (typeof id === "string") {
      refs.selectVesselRef.current(id);
      refs.selectAircraftRef.current(null);
      refs.startTrackingVesselRef.current(
        { id, longitude: event.lngLat.lng, latitude: event.lngLat.lat },
        { follow: false }
      );
    }
  });

  map.on("click", "aircraft-points", (event) => {
    if (refs.isAreaDrawingRef.current) {
      return;
    }

    const id = event.features?.[0]?.properties?.id;
    if (typeof id === "string") {
      refs.selectAircraftRef.current(id);
      refs.selectVesselRef.current(null);
      refs.startTrackingAircraftRef.current(
        { id, longitude: event.lngLat.lng, latitude: event.lngLat.lat },
        { follow: false }
      );
    }
  });

  map.on("mousedown", (event) => {
    if (!refs.isAreaDrawingRef.current || event.originalEvent.button !== 0) {
      return;
    }

    event.preventDefault();
    refs.drawStartRef.current = event.lngLat;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
  });

  map.on("mousemove", (event) => {
    if (!refs.drawStartRef.current || !refs.isAreaDrawingRef.current) {
      return;
    }

    const bounds = toBounds(refs.drawStartRef.current, event.lngLat);
    if (isMeaningfulBounds(bounds)) {
      refs.updateAreaDraftRef.current({ bounds });
    }
  });

  map.on("mouseup", (event) => {
    if (!refs.drawStartRef.current || !refs.isAreaDrawingRef.current) {
      return;
    }

    const bounds = toBounds(refs.drawStartRef.current, event.lngLat);
    refs.drawStartRef.current = null;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";

    if (isMeaningfulBounds(bounds)) {
      refs.completeAreaDrawingRef.current({ bounds });
    }
  });

  for (const layerId of ["vessel-points", "aircraft-points"]) {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  }
}

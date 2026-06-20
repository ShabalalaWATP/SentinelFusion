import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { mapStyleRegistry } from "../../map/MapStyleRegistry";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useVesselStore } from "../../stores/vesselStore";
import { fitMapToArea, updateAreaSource } from "./areaOverlay";
import { applyProjection, isMeaningfulBounds, toBounds } from "./mapCanvasUtils";
import {
  type MapCanvasSyncState,
  syncFireAnomalyLayer,
  syncIntelligenceLayers,
  syncMapCanvasState,
  syncTrafficSources
} from "./mapCanvasSync";
import { MapControls } from "./MapControls";
import { useFireAnomalyData } from "./useFireAnomalyData";
import { useMapTrafficData } from "./useMapTrafficData";

type MapCanvasProps = {
  showRoutes: boolean;
};

export function MapCanvas({ showRoutes }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activeStyleIdRef = useRef<string | null>(null);
  const {
    aircraft,
    aircraftPointData,
    aircraftTrackData,
    aircraftTrackMarkerData,
    pointData,
    trackMarkerData,
    trackData,
    vessels
  } = useMapTrafficData(showRoutes);
  const selectVessel = useVesselStore((state) => state.selectVessel);
  const selectAircraft = useAircraftStore((state) => state.selectAircraft);
  const selectVesselRef = useRef(selectVessel);
  const selectAircraftRef = useRef(selectAircraft);
  const startTrackingAircraft = useMapStore((state) => state.startTrackingAircraft);
  const startTrackingVessel = useMapStore((state) => state.startTrackingVessel);
  const startTrackingAircraftRef = useRef(startTrackingAircraft);
  const startTrackingVesselRef = useRef(startTrackingVessel);
  const styleId = useMapStore((state) => state.styleId);
  const initialStyleIdRef = useRef(styleId);
  const projection = useMapStore((state) => state.projection);
  const intelligenceLayers = useMapStore((state) => state.intelligenceLayers);
  const fireAnomalyData = useFireAnomalyData();
  const focusRequest = useMapStore((state) => state.focusRequest);
  const trackedTarget = useMapStore((state) => state.trackedTarget);
  const areaDraft = useMapStore((state) => state.areaDraft);
  const areaFocusRequest = useMapStore((state) => state.areaFocusRequest);
  const areaSelection = useMapStore((state) => state.areaSelection);
  const isAreaDrawing = useMapStore((state) => state.isAreaDrawing);
  const completeAreaDrawing = useMapStore((state) => state.completeAreaDrawing);
  const updateAreaDraft = useMapStore((state) => state.updateAreaDraft);
  const areaOverlay = areaDraft ?? areaFocusRequest ?? areaSelection;
  const latestMapStateRef = useRef<MapCanvasSyncState>({
    aircraftPointData,
    aircraftTrackData,
    aircraftTrackMarkerData,
    areaOverlay,
    fireAnomalyData,
    intelligenceLayers,
    pointData,
    trackMarkerData,
    projection,
    trackData
  });
  const isAreaDrawingRef = useRef(isAreaDrawing);
  const completeAreaDrawingRef = useRef(completeAreaDrawing);
  const updateAreaDraftRef = useRef(updateAreaDraft);
  const drawStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFollowAtRef = useRef(0);

  selectVesselRef.current = selectVessel;
  selectAircraftRef.current = selectAircraft;
  startTrackingAircraftRef.current = startTrackingAircraft;
  startTrackingVesselRef.current = startTrackingVessel;
  isAreaDrawingRef.current = isAreaDrawing;
  completeAreaDrawingRef.current = completeAreaDrawing;
  updateAreaDraftRef.current = updateAreaDraft;
  latestMapStateRef.current = {
    aircraftPointData,
    aircraftTrackData,
    aircraftTrackMarkerData,
    areaOverlay,
    fireAnomalyData,
    intelligenceLayers,
    pointData,
    trackMarkerData,
    projection,
    trackData
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleRegistry.getStyle(initialStyleIdRef.current),
      center: [0, 18],
      zoom: 1.15,
      attributionControl: false
    });
    mapRef.current = map;
    activeStyleIdRef.current = initialStyleIdRef.current;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      syncMapCanvasState(map, latestMapStateRef.current);
    });

    map.on("click", "vessel-points", (event) => {
      if (isAreaDrawingRef.current) {
        return;
      }

      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        selectVesselRef.current(id);
        selectAircraftRef.current(null);
        startTrackingVesselRef.current(
          { id, longitude: event.lngLat.lng, latitude: event.lngLat.lat },
          { follow: false }
        );
      }
    });

    map.on("click", "aircraft-points", (event) => {
      if (isAreaDrawingRef.current) {
        return;
      }

      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        selectAircraftRef.current(id);
        selectVesselRef.current(null);
        startTrackingAircraftRef.current(
          { id, longitude: event.lngLat.lng, latitude: event.lngLat.lat },
          { follow: false }
        );
      }
    });

    map.on("mousedown", (event) => {
      if (!isAreaDrawingRef.current || event.originalEvent.button !== 0) {
        return;
      }

      event.preventDefault();
      drawStartRef.current = event.lngLat;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("mousemove", (event) => {
      if (!drawStartRef.current || !isAreaDrawingRef.current) {
        return;
      }

      const bounds = toBounds(drawStartRef.current, event.lngLat);
      if (isMeaningfulBounds(bounds)) {
        updateAreaDraftRef.current({ bounds });
      }
    });

    map.on("mouseup", (event) => {
      if (!drawStartRef.current || !isAreaDrawingRef.current) {
        return;
      }

      const bounds = toBounds(drawStartRef.current, event.lngLat);
      drawStartRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";

      if (isMeaningfulBounds(bounds)) {
        completeAreaDrawingRef.current({ bounds });
      }
    });

    map.on("mouseenter", "vessel-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "vessel-points", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "aircraft-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "aircraft-points", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || activeStyleIdRef.current === styleId) {
      return;
    }

    activeStyleIdRef.current = styleId;
    map.setStyle(mapStyleRegistry.getStyle(styleId), { diff: false });
    map.once("styledata", () => {
      syncMapCanvasState(map, latestMapStateRef.current);
    });
  }, [styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    syncIntelligenceLayers(map, latestMapStateRef.current);
  }, [intelligenceLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    syncFireAnomalyLayer(map, latestMapStateRef.current);
  }, [fireAnomalyData, intelligenceLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!map.isStyleLoaded()) {
        return;
      }

      syncTrafficSources(map, latestMapStateRef.current);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    aircraftPointData,
    aircraftTrackData,
    aircraftTrackMarkerData,
    pointData,
    trackData,
    trackMarkerData
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      applyProjection(map, projection);
    }
  }, [projection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) {
      return;
    }

    map.flyTo({
      center: [focusRequest.longitude, focusRequest.latitude],
      zoom: Math.max(map.getZoom(), focusRequest.zoom),
      speed: 1.8,
      essential: true
    });
  }, [focusRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackedTarget?.follow) {
      return;
    }

    const entity =
      trackedTarget.domain === "vessel"
        ? vessels.find((vessel) => vessel.id === trackedTarget.id)
        : aircraft.find((item) => item.id === trackedTarget.id);

    if (!entity) {
      return;
    }

    const now = Date.now();
    if (now - lastFollowAtRef.current < 1500) {
      return;
    }

    lastFollowAtRef.current = now;
    map.easeTo({
      center: [entity.longitude, entity.latitude],
      duration: 650,
      essential: true,
      zoom: Math.max(map.getZoom(), trackedTarget.domain === "vessel" ? 12 : 8)
    });
  }, [aircraft, trackedTarget, vessels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    updateAreaSource(map, areaOverlay);

    if (areaFocusRequest) {
      fitMapToArea(map, areaFocusRequest);
    }
  }, [areaFocusRequest, areaOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = isAreaDrawing ? "crosshair" : "";
  }, [isAreaDrawing]);

  return (
    <section className="relative h-full min-h-[18rem] flex-1 overflow-hidden bg-ocean-950 lg:min-h-0">
      <div ref={containerRef} className="absolute inset-0" aria-label="Traffic map" />
      <div className="pointer-events-none absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
        <MapControls />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-slate-500/[0.18] bg-ocean-900/[0.82] px-3 py-2 text-xs text-slate-300 shadow-panel backdrop-blur sm:bottom-4 sm:left-20">
        Server AIS and flight feeds
      </div>
    </section>
  );
}

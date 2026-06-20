import type { Map as MapLibreMap } from "maplibre-gl";
import { ensureAircraftLayers, updateAircraftSources } from "./aircraftLayers";
import { updateAreaSource } from "./areaOverlay";
import { applyProjection } from "./mapCanvasUtils";
import { ensureIntelligenceLayers, updateIntelligenceLayerVisibility } from "./mapIntelligenceLayers";
import { ensureVesselLayers, updateVesselSources } from "./vesselLayers";

type VesselSourceArgs = Parameters<typeof updateVesselSources>;
type AircraftSourceArgs = Parameters<typeof updateAircraftSources>;

export type MapCanvasSyncState = {
  aircraftPointData: AircraftSourceArgs[1];
  aircraftTrackData: AircraftSourceArgs[2];
  aircraftTrackMarkerData: AircraftSourceArgs[3];
  areaOverlay: Parameters<typeof updateAreaSource>[1];
  intelligenceLayers: Parameters<typeof updateIntelligenceLayerVisibility>[1];
  pointData: VesselSourceArgs[1];
  projection: Parameters<typeof applyProjection>[1];
  trackData: VesselSourceArgs[2];
  trackMarkerData: VesselSourceArgs[3];
};

export function syncMapCanvasState(map: MapLibreMap, state: MapCanvasSyncState): void {
  syncTrafficSources(map, state);
  ensureIntelligenceLayers(map);
  updateAreaSource(map, state.areaOverlay);
  updateIntelligenceLayerVisibility(map, state.intelligenceLayers);
  applyProjection(map, state.projection);
}

export function syncTrafficSources(map: MapLibreMap, state: MapCanvasSyncState): void {
  ensureVesselLayers(map);
  ensureAircraftLayers(map);
  updateVesselSources(map, state.pointData, state.trackData, state.trackMarkerData);
  updateAircraftSources(
    map,
    state.aircraftPointData,
    state.aircraftTrackData,
    state.aircraftTrackMarkerData
  );
}

export function syncIntelligenceLayers(map: MapLibreMap, state: MapCanvasSyncState): void {
  ensureIntelligenceLayers(map);
  updateIntelligenceLayerVisibility(map, state.intelligenceLayers);
}

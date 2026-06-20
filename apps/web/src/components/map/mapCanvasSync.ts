import type { Map as MapLibreMap } from "maplibre-gl";
import { ensureAircraftLayers, updateAircraftSources } from "./aircraftLayers";
import { updateAreaSource } from "./areaOverlay";
import {
  ensureFireAnomalyLayers,
  updateFireAnomalySource,
  updateFireAnomalyVisibility
} from "./fireAnomalyOverlay";
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
  fireAnomalyData: Parameters<typeof updateFireAnomalySource>[1];
  intelligenceLayers: Parameters<typeof updateIntelligenceLayerVisibility>[1];
  pointData: VesselSourceArgs[1];
  projection: Parameters<typeof applyProjection>[1];
  trackData: VesselSourceArgs[2];
  trackMarkerData: VesselSourceArgs[3];
};

export function syncMapCanvasState(map: MapLibreMap, state: MapCanvasSyncState): void {
  syncTrafficSources(map, state);
  ensureIntelligenceLayers(map);
  ensureFireAnomalyLayers(map);
  updateAreaSource(map, state.areaOverlay);
  updateIntelligenceLayerVisibility(map, state.intelligenceLayers);
  updateFireAnomalySource(map, state.fireAnomalyData);
  updateFireAnomalyVisibility(map, state.intelligenceLayers["fire-anomalies"]);
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
  ensureFireAnomalyLayers(map);
  updateIntelligenceLayerVisibility(map, state.intelligenceLayers);
  updateFireAnomalyVisibility(map, state.intelligenceLayers["fire-anomalies"]);
}

export function syncFireAnomalyLayer(map: MapLibreMap, state: MapCanvasSyncState): void {
  ensureFireAnomalyLayers(map);
  updateFireAnomalySource(map, state.fireAnomalyData);
  updateFireAnomalyVisibility(map, state.intelligenceLayers["fire-anomalies"]);
}

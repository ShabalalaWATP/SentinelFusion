import type {
  AnalysisAreaResult,
  MapProjection,
  MapStyleId,
  TrafficAreaDefinition
} from "@aisstream/shared";
import { create } from "zustand";

export type AreaFocusRequest = Pick<AnalysisAreaResult, "bounds" | "id" | "name"> & {
  requestedAt: number;
};

export type AreaSelection = AreaFocusRequest;
export type MapDomainFilter = "all" | "vessels" | "aircraft";
export type IntelligenceLayerId =
  | "airports"
  | "chokepoints"
  | "conflict-events"
  | "fire-anomalies"
  | "maritime-zones"
  | "ports"
  | "risk-zones"
  | "shipping-lanes";
export type IntelligenceLayerState = Record<IntelligenceLayerId, boolean>;
export type TrackedTarget = {
  id: string;
  domain: "vessel" | "aircraft";
  follow: boolean;
  startedAt: number;
};

type MapState = {
  domainFilter: MapDomainFilter;
  styleId: MapStyleId;
  projection: MapProjection;
  focusRequest: {
    id: string;
    domain: "vessel" | "aircraft";
    longitude: number;
    latitude: number;
    zoom: number;
    requestedAt: number;
  } | null;
  areaFocusRequest: AreaFocusRequest | null;
  areaDraft: AreaSelection | null;
  areaSelection: AreaSelection | null;
  areaOnlyMode: boolean;
  intelligenceLayers: IntelligenceLayerState;
  isAreaDrawing: boolean;
  trackedTarget: TrackedTarget | null;
  clearAreaFocus(): void;
  clearAreaSelection(): void;
  completeAreaDrawing(area: Pick<AreaSelection, "bounds">): void;
  focusArea(area: Pick<AnalysisAreaResult, "bounds" | "id" | "name">): void;
  focusAircraft(
    aircraft: { id: string; longitude: number; latitude: number },
    options?: { zoom?: number }
  ): void;
  focusVessel(
    vessel: { id: string; longitude: number; latitude: number },
    options?: { zoom?: number }
  ): void;
  selectOperationalArea(area: Pick<TrafficAreaDefinition, "bounds" | "id" | "name">): void;
  startAreaDrawing(): void;
  startTrackingAircraft(
    aircraft: { id: string; longitude: number; latitude: number },
    options?: { follow?: boolean; zoom?: number }
  ): void;
  startTrackingVessel(
    vessel: { id: string; longitude: number; latitude: number },
    options?: { follow?: boolean; zoom?: number }
  ): void;
  stopTracking(): void;
  setAreaOnlyMode(enabled: boolean): void;
  setIntelligenceLayer(id: IntelligenceLayerId, enabled: boolean): void;
  toggleIntelligenceLayer(id: IntelligenceLayerId): void;
  updateAreaDraft(area: Pick<AreaSelection, "bounds">): void;
  setDomainFilter(filter: MapDomainFilter): void;
  setStyleId(styleId: MapStyleId): void;
  setProjection(projection: MapProjection): void;
};

export const useMapStore = create<MapState>((set) => ({
  domainFilter: "all",
  styleId: "dark",
  projection: "mercator",
  focusRequest: null,
  areaFocusRequest: null,
  areaDraft: null,
  areaSelection: null,
  areaOnlyMode: false,
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
  trackedTarget: null,
  clearAreaFocus: () => set({ areaFocusRequest: null }),
  clearAreaSelection: () =>
    set({
      areaDraft: null,
      areaFocusRequest: null,
      areaSelection: null,
      areaOnlyMode: false,
      isAreaDrawing: false
    }),
  completeAreaDrawing: (area) =>
    set({
      areaDraft: null,
      areaFocusRequest: null,
      areaSelection: {
        id: "selected-map-area",
        name: "Selected map area",
        bounds: area.bounds,
        requestedAt: Date.now()
      },
      isAreaDrawing: false
    }),
  focusArea: (area) =>
    set({
      areaFocusRequest: {
        ...area,
        requestedAt: Date.now()
      }
    }),
  focusAircraft: (aircraft, options) =>
    set({
      focusRequest: {
        id: aircraft.id,
        domain: "aircraft",
        longitude: aircraft.longitude,
        latitude: aircraft.latitude,
        zoom: options?.zoom ?? 11.5,
        requestedAt: Date.now()
      }
    }),
  focusVessel: (vessel, options) =>
    set({
      focusRequest: {
        id: vessel.id,
        domain: "vessel",
        longitude: vessel.longitude,
        latitude: vessel.latitude,
        zoom: options?.zoom ?? 15,
        requestedAt: Date.now()
      }
    }),
  selectOperationalArea: (area) =>
    set({
      areaDraft: null,
      areaFocusRequest: {
        ...area,
        requestedAt: Date.now()
      },
      areaSelection: {
        ...area,
        requestedAt: Date.now()
      },
      isAreaDrawing: false
    }),
  startAreaDrawing: () =>
    set({
      areaDraft: null,
      areaFocusRequest: null,
      isAreaDrawing: true
    }),
  startTrackingAircraft: (aircraft, options) => {
    const now = Date.now();
    return set({
      focusRequest: {
        id: aircraft.id,
        domain: "aircraft",
        longitude: aircraft.longitude,
        latitude: aircraft.latitude,
        zoom: options?.zoom ?? 11.5,
        requestedAt: now
      },
      trackedTarget: {
        id: aircraft.id,
        domain: "aircraft",
        follow: options?.follow ?? true,
        startedAt: now
      }
    });
  },
  startTrackingVessel: (vessel, options) => {
    const now = Date.now();
    return set({
      focusRequest: {
        id: vessel.id,
        domain: "vessel",
        longitude: vessel.longitude,
        latitude: vessel.latitude,
        zoom: options?.zoom ?? 15,
        requestedAt: now
      },
      trackedTarget: {
        id: vessel.id,
        domain: "vessel",
        follow: options?.follow ?? true,
        startedAt: now
      }
    });
  },
  stopTracking: () => set({ trackedTarget: null }),
  setAreaOnlyMode: (areaOnlyMode) => set({ areaOnlyMode }),
  setIntelligenceLayer: (id, enabled) =>
    set((state) => ({
      intelligenceLayers: {
        ...state.intelligenceLayers,
        [id]: enabled
      }
    })),
  toggleIntelligenceLayer: (id) =>
    set((state) => ({
      intelligenceLayers: {
        ...state.intelligenceLayers,
        [id]: !state.intelligenceLayers[id]
      }
    })),
  updateAreaDraft: (area) =>
    set({
      areaDraft: {
        id: "area-draft",
        name: "Area draft",
        bounds: area.bounds,
        requestedAt: Date.now()
      }
    }),
  setDomainFilter: (domainFilter) => set({ domainFilter }),
  setStyleId: (styleId) => set({ styleId }),
  setProjection: (projection) => set({ projection })
}));

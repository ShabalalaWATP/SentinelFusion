import type { MapProjection } from "@aisstream/shared";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { AreaFocusRequest } from "../../stores/mapStore";

export function toBounds(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): AreaFocusRequest["bounds"] {
  return {
    south: Math.max(-90, Math.min(start.lat, end.lat)),
    west: Math.max(-180, Math.min(start.lng, end.lng)),
    north: Math.min(90, Math.max(start.lat, end.lat)),
    east: Math.min(180, Math.max(start.lng, end.lng))
  };
}

export function isMeaningfulBounds(bounds: AreaFocusRequest["bounds"]): boolean {
  return bounds.north - bounds.south > 0.001 && Math.abs(bounds.east - bounds.west) > 0.001;
}

export function applyProjection(map: MapLibreMap, projection: MapProjection): void {
  if (!map.isStyleLoaded()) {
    return;
  }

  const mapWithProjection = map as MapLibreMap & {
    setProjection?: (projection: { type: MapProjection }) => void;
  };

  try {
    mapWithProjection.setProjection?.({ type: projection });
  } catch {
    try {
      mapWithProjection.setProjection?.({ type: "mercator" });
    } catch {
      // Projection support varies by MapLibre style/runtime. Mercator remains the default.
    }
  }
}

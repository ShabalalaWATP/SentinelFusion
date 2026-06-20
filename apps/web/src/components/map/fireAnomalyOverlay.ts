import type { FireContextResponse } from "@aisstream/shared";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
  CircleLayerSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";

const fireSourceId = "firms-fire-anomalies";
const fireCircleLayerId = "firms-fire-anomalies-circle";
const fireLabelLayerId = "firms-fire-anomalies-label";

export type FireAnomalyFeatureCollection = FeatureCollection<Point>;

export function ensureFireAnomalyLayers(map: MapLibreMap): void {
  if (!map.getSource(fireSourceId)) {
    map.addSource(fireSourceId, {
      type: "geojson",
      data: emptyFireAnomalyCollection()
    });
  }

  if (!map.getLayer(fireCircleLayerId)) {
    map.addLayer({
      id: fireCircleLayerId,
      type: "circle",
      source: fireSourceId,
      paint: {
        "circle-color": [
          "match",
          ["get", "confidence"],
          "high",
          "#ef4444",
          "nominal",
          "#f97316",
          "low",
          "#f59e0b",
          "#f8fafc"
        ],
        "circle-opacity": 0.78,
        "circle-radius": ["interpolate", ["linear"], ["get", "frp"], 0, 4, 50, 8, 150, 12],
        "circle-stroke-color": "#fff7ed",
        "circle-stroke-width": 1.2
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer(fireLabelLayerId)) {
    map.addLayer({
      id: fireLabelLayerId,
      type: "symbol",
      source: fireSourceId,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#fed7aa",
        "text-halo-color": "#190b05",
        "text-halo-width": 1.2
      }
    } satisfies SymbolLayerSpecification);
  }
}

export function updateFireAnomalySource(
  map: MapLibreMap,
  collection: FireAnomalyFeatureCollection
): void {
  const source = map.getSource(fireSourceId) as GeoJSONSource | undefined;
  source?.setData(collection);
}

export function updateFireAnomalyVisibility(map: MapLibreMap, enabled: boolean): void {
  const visibility = enabled ? "visible" : "none";
  for (const layerId of [fireCircleLayerId, fireLabelLayerId]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

export function toFireAnomalyCollection(
  result: FireContextResponse | null
): FireAnomalyFeatureCollection {
  if (!result || result.status !== "ok") {
    return emptyFireAnomalyCollection();
  }

  return {
    type: "FeatureCollection",
    features: result.detections.map((detection) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [detection.longitude, detection.latitude]
      },
      properties: {
        id: detection.id,
        confidence: detection.confidence,
        frp: detection.fireRadiativePowerMw ?? 0,
        label: detection.confidence === "high" ? "High fire" : "Fire"
      }
    } satisfies Feature<Point>))
  };
}

export function emptyFireAnomalyCollection(): FireAnomalyFeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

import type { ConflictContextResponse } from "@aisstream/shared";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
  CircleLayerSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";

const conflictSourceId = "conflict-context-events";
const conflictCircleLayerId = "conflict-context-events-circle";
const conflictLabelLayerId = "conflict-context-events-label";

export type ConflictContextFeatureCollection = FeatureCollection<Point>;

export function ensureConflictContextLayers(map: MapLibreMap): void {
  if (!map.getSource(conflictSourceId)) {
    map.addSource(conflictSourceId, {
      type: "geojson",
      data: emptyConflictContextCollection()
    });
  }

  if (!map.getLayer(conflictCircleLayerId)) {
    map.addLayer({
      id: conflictCircleLayerId,
      type: "circle",
      source: conflictSourceId,
      paint: {
        "circle-color": [
          "match",
          ["get", "severity"],
          "high",
          "#ef4444",
          "medium",
          "#f97316",
          "#fbbf24"
        ],
        "circle-opacity": 0.82,
        "circle-radius": ["interpolate", ["linear"], ["get", "fatalities"], 0, 5, 1, 8, 10, 13],
        "circle-stroke-color": "#fee2e2",
        "circle-stroke-width": 1.3
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer(conflictLabelLayerId)) {
    map.addLayer({
      id: conflictLabelLayerId,
      type: "symbol",
      source: conflictSourceId,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#fecaca",
        "text-halo-color": "#19060a",
        "text-halo-width": 1.2
      }
    } satisfies SymbolLayerSpecification);
  }
}

export function updateConflictContextSource(
  map: MapLibreMap,
  collection: ConflictContextFeatureCollection
): void {
  const source = map.getSource(conflictSourceId) as GeoJSONSource | undefined;
  source?.setData(collection);
}

export function updateConflictContextVisibility(map: MapLibreMap, enabled: boolean): void {
  const visibility = enabled ? "visible" : "none";
  for (const layerId of [conflictCircleLayerId, conflictLabelLayerId]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

export function toConflictContextCollection(
  result: ConflictContextResponse | null
): ConflictContextFeatureCollection {
  if (!result || result.status !== "ok") {
    return emptyConflictContextCollection();
  }

  return {
    type: "FeatureCollection",
    features: result.events.map((event) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [event.longitude, event.latitude]
      },
      properties: {
        id: event.id,
        eventType: event.eventType,
        fatalities: event.fatalities,
        label: labelFor(event),
        severity: event.severity
      }
    } satisfies Feature<Point>))
  };
}

export function emptyConflictContextCollection(): ConflictContextFeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function labelFor(event: ConflictContextResponse["events"][number]): string {
  if (/protest/i.test(event.eventType)) {
    return "Protest";
  }
  if (/riot/i.test(event.eventType)) {
    return "Riot";
  }
  return event.severity === "high" ? "Conflict" : "Event";
}

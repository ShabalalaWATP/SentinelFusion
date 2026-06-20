import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  CircleLayerSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";
import { ensureAreaLayers } from "./areaOverlay";
import { ensureShipIcons } from "./shipIcons";
import { emptyFeatureCollection } from "./vesselMapData";

const vesselSourceId = "vessels";
const trackSourceId = "vessel-tracks";
const trackMarkerSourceId = "vessel-track-markers";

export function ensureVesselLayers(map: MapLibreMap): void {
  ensureShipIcons(map);
  ensureAreaLayers(map);

  if (!map.getSource(trackSourceId)) {
    map.addSource(trackSourceId, {
      type: "geojson",
      data: emptyFeatureCollection()
    });
  }

  if (!map.getLayer("vessel-tracks")) {
    map.addLayer({
      id: "vessel-tracks",
      type: "line",
      source: trackSourceId,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "selected"], 1],
          "#facc15",
          ["==", ["get", "riskLevel"], "high"],
          "#fb7185",
          "#38bdf8"
        ],
        "line-opacity": ["case", ["==", ["get", "selected"], 1], 0.95, 0.42],
        "line-width": ["case", ["==", ["get", "selected"], 1], 4.2, 1.5]
      }
    } satisfies LineLayerSpecification);
  }

  if (!map.getSource(trackMarkerSourceId)) {
    map.addSource(trackMarkerSourceId, {
      type: "geojson",
      data: emptyFeatureCollection()
    });
  }

  if (!map.getLayer("vessel-track-starts")) {
    map.addLayer({
      id: "vessel-track-starts",
      type: "circle",
      source: trackMarkerSourceId,
      filter: ["==", ["get", "marker"], "start"],
      paint: {
        "circle-radius": ["case", ["==", ["get", "selected"], 1], 4.5, 3],
        "circle-color": "#0f172a",
        "circle-opacity": 0.86,
        "circle-stroke-color": "#94a3b8",
        "circle-stroke-opacity": 0.78,
        "circle-stroke-width": 1.5
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer("vessel-track-latest")) {
    map.addLayer({
      id: "vessel-track-latest",
      type: "circle",
      source: trackMarkerSourceId,
      filter: ["==", ["get", "marker"], "latest"],
      paint: {
        "circle-radius": ["case", ["==", ["get", "selected"], 1], 7, 4.5],
        "circle-color": [
          "case",
          ["==", ["get", "selected"], 1],
          "#facc15",
          ["==", ["get", "riskLevel"], "high"],
          "#fb7185",
          "#38bdf8"
        ],
        "circle-opacity": ["case", ["==", ["get", "selected"], 1], 0.98, 0.84],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": ["case", ["==", ["get", "selected"], 1], 0.95, 0.54],
        "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.4, 1.4]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getSource(vesselSourceId)) {
    map.addSource(vesselSourceId, {
      type: "geojson",
      data: emptyFeatureCollection()
    });
  }

  if (!map.getLayer("vessel-watch-halo")) {
    map.addLayer({
      id: "vessel-watch-halo",
      type: "circle",
      source: vesselSourceId,
      filter: ["==", ["get", "watched"], 1],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9, 8, 18, 13, 27],
        "circle-color": "#22d3ee",
        "circle-opacity": 0.13,
        "circle-stroke-color": "#67e8f9",
        "circle-stroke-opacity": 0.78,
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 13, 3]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer("vessel-selection-halo")) {
    map.addLayer({
      id: "vessel-selection-halo",
      type: "circle",
      source: vesselSourceId,
      filter: ["==", ["get", "selected"], 1],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 11, 8, 20, 13, 31],
        "circle-color": "#facc15",
        "circle-opacity": 0.18,
        "circle-stroke-color": "#fef08a",
        "circle-stroke-opacity": 0.95,
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 13, 4]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer("vessel-points")) {
    map.addLayer({
      id: "vessel-points",
      type: "symbol",
      source: vesselSourceId,
      layout: {
        "icon-image": [
          "case",
          ["==", ["get", "classification"], "military"],
          "ship-military",
          ["==", ["get", "classification"], "government"],
          "ship-government",
          ["==", ["get", "riskLevel"], "high"],
          "ship-high",
          ["==", ["get", "riskLevel"], "medium"],
          "ship-medium",
          "ship-low"
        ],
        "icon-size": [
          "case",
          ["==", ["get", "selected"], 1],
          1.05,
          ["==", ["get", "watched"], 1],
          0.82,
          0.68
        ],
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-opacity": [
          "case",
          ["==", ["get", "selected"], 1],
          1,
          ["==", ["get", "watched"], 1],
          0.98,
          0.92
        ]
      }
    } satisfies SymbolLayerSpecification);
  }
}

export function updateVesselSources(
  map: MapLibreMap,
  points: FeatureCollection<Point>,
  tracks: FeatureCollection<LineString>,
  trackMarkers: FeatureCollection<Point>
): void {
  const pointSource = map.getSource(vesselSourceId) as GeoJSONSource | undefined;
  const trackSource = map.getSource(trackSourceId) as GeoJSONSource | undefined;
  const trackMarkerSource = map.getSource(trackMarkerSourceId) as GeoJSONSource | undefined;

  pointSource?.setData(points);
  trackSource?.setData(tracks);
  trackMarkerSource?.setData(trackMarkers);
}

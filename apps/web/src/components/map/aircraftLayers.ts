import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  CircleLayerSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";
import { emptyAircraftFeatureCollection } from "./aircraftMapData";
import { ensureAircraftIcons } from "./aircraftIcons";

const aircraftSourceId = "aircraft";
const aircraftTrackSourceId = "aircraft-tracks";
const aircraftTrackMarkerSourceId = "aircraft-track-markers";

export function ensureAircraftLayers(map: MapLibreMap): void {
  ensureAircraftIcons(map);

  if (!map.getSource(aircraftTrackSourceId)) {
    map.addSource(aircraftTrackSourceId, {
      type: "geojson",
      data: emptyAircraftFeatureCollection()
    });
  }

  if (!map.getLayer("aircraft-tracks")) {
    map.addLayer({
      id: "aircraft-tracks",
      type: "line",
      source: aircraftTrackSourceId,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "selected"], 1],
          "#facc15",
          ["==", ["get", "emergency"], 1],
          "#fb7185",
          ["==", ["get", "classification"], "military"],
          "#a78bfa",
          "#22d3ee"
        ],
        "line-opacity": ["case", ["==", ["get", "selected"], 1], 0.95, 0.36],
        "line-width": ["case", ["==", ["get", "selected"], 1], 3.8, 1.35],
        "line-dasharray": ["case", ["==", ["get", "selected"], 1], ["literal", [1, 0]], ["literal", [1.4, 1.2]]]
      }
    } satisfies LineLayerSpecification);
  }

  if (!map.getSource(aircraftTrackMarkerSourceId)) {
    map.addSource(aircraftTrackMarkerSourceId, {
      type: "geojson",
      data: emptyAircraftFeatureCollection()
    });
  }

  if (!map.getLayer("aircraft-track-starts")) {
    map.addLayer({
      id: "aircraft-track-starts",
      type: "circle",
      source: aircraftTrackMarkerSourceId,
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

  if (!map.getLayer("aircraft-track-latest")) {
    map.addLayer({
      id: "aircraft-track-latest",
      type: "circle",
      source: aircraftTrackMarkerSourceId,
      filter: ["==", ["get", "marker"], "latest"],
      paint: {
        "circle-radius": ["case", ["==", ["get", "selected"], 1], 7, 4.5],
        "circle-color": [
          "case",
          ["==", ["get", "selected"], 1],
          "#facc15",
          ["==", ["get", "emergency"], 1],
          "#fb7185",
          ["==", ["get", "classification"], "military"],
          "#a78bfa",
          "#22d3ee"
        ],
        "circle-opacity": ["case", ["==", ["get", "selected"], 1], 0.98, 0.84],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": ["case", ["==", ["get", "selected"], 1], 0.95, 0.54],
        "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.4, 1.4]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getSource(aircraftSourceId)) {
    map.addSource(aircraftSourceId, {
      type: "geojson",
      data: emptyAircraftFeatureCollection()
    });
  }

  if (!map.getLayer("aircraft-watch-halo")) {
    map.addLayer({
      id: "aircraft-watch-halo",
      type: "circle",
      source: aircraftSourceId,
      filter: ["==", ["get", "watched"], 1],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 10, 8, 20, 12, 30],
        "circle-color": "#38bdf8",
        "circle-opacity": 0.12,
        "circle-stroke-color": "#7dd3fc",
        "circle-stroke-opacity": 0.76,
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 12, 3]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer("aircraft-selection-halo")) {
    map.addLayer({
      id: "aircraft-selection-halo",
      type: "circle",
      source: aircraftSourceId,
      filter: ["==", ["get", "selected"], 1],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 12, 8, 23, 12, 36],
        "circle-color": "#facc15",
        "circle-opacity": 0.18,
        "circle-stroke-color": "#fef08a",
        "circle-stroke-opacity": 0.98,
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 2.4, 12, 4.2]
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer("aircraft-points")) {
    map.addLayer({
      id: "aircraft-points",
      type: "symbol",
      source: aircraftSourceId,
      layout: {
        "icon-image": [
          "case",
          ["==", ["get", "emergency"], 1],
          "aircraft-emergency",
          ["==", ["get", "classification"], "military"],
          "aircraft-military",
          ["==", ["get", "classification"], "government"],
          "aircraft-government",
          ["==", ["get", "classification"], "commercial"],
          "aircraft-commercial",
          ["==", ["get", "classification"], "private"],
          "aircraft-private",
          "aircraft-unknown"
        ],
        "icon-size": [
          "case",
          ["==", ["get", "selected"], 1],
          0.95,
          ["==", ["get", "watched"], 1],
          0.74,
          0.58
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
          0.9
        ]
      }
    } satisfies SymbolLayerSpecification);
  }
}

export function updateAircraftSources(
  map: MapLibreMap,
  points: FeatureCollection<Point>,
  tracks: FeatureCollection<LineString>,
  trackMarkers: FeatureCollection<Point>
): void {
  const pointSource = map.getSource(aircraftSourceId) as GeoJSONSource | undefined;
  const trackSource = map.getSource(aircraftTrackSourceId) as GeoJSONSource | undefined;
  const trackMarkerSource = map.getSource(aircraftTrackMarkerSourceId) as GeoJSONSource | undefined;

  pointSource?.setData(points);
  trackSource?.setData(tracks);
  trackMarkerSource?.setData(trackMarkers);
}

import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { IntelligenceLayerId, IntelligenceLayerState } from "../../stores/mapStore";

type LayerDefinition = {
  id: IntelligenceLayerId;
  sourceId: string;
  layerIds: string[];
  data: FeatureCollection<Geometry>;
};

const layers: LayerDefinition[] = [
  {
    id: "ports",
    sourceId: "intel-ports",
    layerIds: ["intel-ports-circle", "intel-ports-label"],
    data: pointCollection([
      ["Portsmouth", -1.108, 50.812],
      ["Singapore", 103.79, 1.27],
      ["Rotterdam", 4.1, 51.95],
      ["Norfolk", -76.32, 36.95],
      ["Suez", 32.55, 29.97],
      ["Jebel Ali", 55.05, 25.01]
    ])
  },
  {
    id: "airports",
    sourceId: "intel-airports",
    layerIds: ["intel-airports-circle", "intel-airports-label"],
    data: pointCollection([
      ["Heathrow", -0.454, 51.47],
      ["JFK", -73.78, 40.64],
      ["Dubai", 55.36, 25.25],
      ["Doha", 51.61, 25.27],
      ["Singapore Changi", 103.99, 1.36]
    ])
  },
  {
    id: "chokepoints",
    sourceId: "intel-chokepoints",
    layerIds: ["intel-chokepoints-fill", "intel-chokepoints-line"],
    data: polygonCollection([
      ["Strait of Hormuz", 25.35, 55.05, 27.25, 57.35],
      ["Suez Canal", 29.75, 32.1, 31.35, 32.65],
      ["Bab el-Mandeb", 12, 42.75, 13.25, 44],
      ["Strait of Gibraltar", 35.85, -5.95, 36.25, -5.15],
      ["Singapore Strait", 1.05, 103.45, 1.55, 104.25]
    ])
  },
  {
    id: "risk-zones",
    sourceId: "intel-risk-zones",
    layerIds: ["intel-risk-zones-fill", "intel-risk-zones-line"],
    data: polygonCollection([
      ["Red Sea security zone", 12, 37, 23, 44.5],
      ["Persian Gulf watch zone", 24, 48, 30.7, 57.3],
      ["South China Sea watch zone", 2, 105, 23.5, 122.5]
    ])
  },
  {
    id: "shipping-lanes",
    sourceId: "intel-shipping-lanes",
    layerIds: ["intel-shipping-lanes-line"],
    data: lineCollection([
      ["Channel lane", [[-6, 49.8], [-2, 50.3], [1.5, 51.1]]],
      ["Hormuz lane", [[54.9, 25.4], [56.1, 26.25], [57.4, 26.7]]],
      ["Suez lane", [[32.35, 29.6], [32.42, 30.3], [32.55, 31.25]]],
      ["Singapore lane", [[103.4, 1.16], [103.85, 1.24], [104.25, 1.32]]]
    ])
  },
  {
    id: "maritime-zones",
    sourceId: "intel-maritime-zones",
    layerIds: ["intel-maritime-zones-line"],
    data: lineCollection([
      ["UK south coast zone", [[-5.8, 49.3], [-1.8, 49.65], [1.6, 50.65]]],
      ["Gulf zone", [[48.3, 25.2], [52.5, 25.8], [56.6, 26.4]]],
      ["Taiwan maritime zone", [[118.2, 22.3], [119.8, 24.2], [121.2, 26.0]]]
    ])
  }
];

export function ensureIntelligenceLayers(map: MapLibreMap): void {
  for (const layer of layers) {
    if (!map.getSource(layer.sourceId)) {
      map.addSource(layer.sourceId, { type: "geojson", data: layer.data });
    } else {
      (map.getSource(layer.sourceId) as GeoJSONSource).setData(layer.data);
    }
  }

  addPolygonLayers(map, "intel-chokepoints", "#22d3ee", 0.08);
  addPolygonLayers(map, "intel-risk-zones", "#f59e0b", 0.1);
  addLineLayer(map, "intel-shipping-lanes-line", "intel-shipping-lanes", "#38bdf8", [2, 1.4]);
  addLineLayer(map, "intel-maritime-zones-line", "intel-maritime-zones", "#a78bfa", [1, 1.8]);
  addPointLayers(map, "intel-ports", "#2dd4bf");
  addPointLayers(map, "intel-airports", "#60a5fa");
}

export function updateIntelligenceLayerVisibility(
  map: MapLibreMap,
  enabledLayers: IntelligenceLayerState
): void {
  for (const layer of layers) {
    const visibility = enabledLayers[layer.id] ? "visible" : "none";
    for (const layerId of layer.layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  }
}

function addPolygonLayers(map: MapLibreMap, sourceId: string, color: string, opacity: number): void {
  if (!map.getLayer(`${sourceId}-fill`)) {
    map.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": color,
        "fill-opacity": opacity
      }
    } satisfies FillLayerSpecification);
  }

  if (!map.getLayer(`${sourceId}-line`)) {
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": color,
        "line-opacity": 0.74,
        "line-width": 1.4,
        "line-dasharray": [2, 1.5]
      }
    } satisfies LineLayerSpecification);
  }
}

function addLineLayer(
  map: MapLibreMap,
  id: string,
  sourceId: string,
  color: string,
  dasharray: number[]
): void {
  if (map.getLayer(id)) {
    return;
  }

  map.addLayer({
    id,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": color,
      "line-opacity": 0.68,
      "line-width": 1.8,
      "line-dasharray": dasharray
    }
  } satisfies LineLayerSpecification);
}

function addPointLayers(map: MapLibreMap, sourceId: string, color: string): void {
  if (!map.getLayer(`${sourceId}-circle`)) {
    map.addLayer({
      id: `${sourceId}-circle`,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-color": color,
        "circle-opacity": 0.72,
        "circle-radius": 4,
        "circle-stroke-color": "#e0f2fe",
        "circle-stroke-width": 1
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer(`${sourceId}-label`)) {
    map.addLayer({
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.05],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#e2e8f0",
        "text-halo-color": "#071015",
        "text-halo-width": 1.2
      }
    } satisfies SymbolLayerSpecification);
  }
}

function pointCollection(points: Array<[string, number, number]>): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: points.map(([name, longitude, latitude]) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: { name }
    }))
  };
}

function polygonCollection(
  areas: Array<[string, number, number, number, number]>
): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: areas.map(([name, south, west, north, east]) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
      },
      properties: { name }
    }))
  };
}

function lineCollection(
  lines: Array<[string, Array<[number, number]>]>
): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: lines.map(([name, coordinates]) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: { name }
    }))
  };
}

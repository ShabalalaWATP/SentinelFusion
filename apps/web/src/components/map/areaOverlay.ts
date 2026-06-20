import type { Feature, FeatureCollection, Polygon } from "geojson";
import type {
  FillLayerSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap
} from "maplibre-gl";
import type { AreaFocusRequest } from "../../stores/mapStore";

const areaSourceId = "analysis-area";

export function ensureAreaLayers(map: MapLibreMap): void {
  if (!map.getSource(areaSourceId)) {
    map.addSource(areaSourceId, {
      type: "geojson",
      data: emptyAreaCollection()
    });
  }

  if (!map.getLayer("analysis-area-fill")) {
    map.addLayer({
      id: "analysis-area-fill",
      type: "fill",
      source: areaSourceId,
      paint: {
        "fill-color": "#22d3ee",
        "fill-opacity": 0.14
      }
    } satisfies FillLayerSpecification);
  }

  if (!map.getLayer("analysis-area-outline")) {
    map.addLayer({
      id: "analysis-area-outline",
      type: "line",
      source: areaSourceId,
      paint: {
        "line-color": "#67e8f9",
        "line-opacity": 0.85,
        "line-width": 2.2,
        "line-dasharray": [2, 1.4]
      }
    } satisfies LineLayerSpecification);
  }
}

export function updateAreaSource(map: MapLibreMap, area: AreaFocusRequest | null): void {
  const source = map.getSource(areaSourceId) as GeoJSONSource | undefined;
  source?.setData(toAreaCollection(area));
}

export function fitMapToArea(map: MapLibreMap, area: AreaFocusRequest): void {
  const { south, west, north, east } = area.bounds;

  map.fitBounds(
    [
      [west, south],
      [east, north]
    ],
    {
      duration: 900,
      essential: true,
      maxZoom: 11,
      padding: 72
    }
  );
}

function toAreaCollection(area: AreaFocusRequest | null): FeatureCollection<Polygon> {
  if (!area) {
    return emptyAreaCollection();
  }

  const { south, west, north, east } = area.bounds;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south]
            ]
          ]
        },
        properties: {
          id: area.id,
          name: area.name
        }
      } satisfies Feature<Polygon>
    ]
  };
}

function emptyAreaCollection(): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: []
  };
}

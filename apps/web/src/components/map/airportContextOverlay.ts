import type { AirportContextResponse } from "@aisstream/shared";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
  CircleLayerSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  SymbolLayerSpecification
} from "maplibre-gl";

const airportContextSourceId = "airport-context-airports";
const airportContextCircleLayerId = "airport-context-airports-circle";
const airportContextLabelLayerId = "airport-context-airports-label";

export type AirportContextFeatureCollection = FeatureCollection<Point>;

export function ensureAirportContextLayers(map: MapLibreMap): void {
  if (!map.getSource(airportContextSourceId)) {
    map.addSource(airportContextSourceId, {
      type: "geojson",
      data: emptyAirportContextCollection()
    });
  }

  if (!map.getLayer(airportContextCircleLayerId)) {
    map.addLayer({
      id: airportContextCircleLayerId,
      type: "circle",
      source: airportContextSourceId,
      paint: {
        "circle-color": [
          "match",
          ["get", "type"],
          "large_airport",
          "#38bdf8",
          "medium_airport",
          "#60a5fa",
          "#93c5fd"
        ],
        "circle-opacity": 0.88,
        "circle-radius": ["interpolate", ["linear"], ["get", "runways"], 0, 4, 4, 8, 12, 11],
        "circle-stroke-color": "#dbeafe",
        "circle-stroke-width": 1.4
      }
    } satisfies CircleLayerSpecification);
  }

  if (!map.getLayer(airportContextLabelLayerId)) {
    map.addLayer({
      id: airportContextLabelLayerId,
      type: "symbol",
      source: airportContextSourceId,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#bfdbfe",
        "text-halo-color": "#06101e",
        "text-halo-width": 1.2
      }
    } satisfies SymbolLayerSpecification);
  }
}

export function updateAirportContextSource(
  map: MapLibreMap,
  collection: AirportContextFeatureCollection
): void {
  const source = map.getSource(airportContextSourceId) as GeoJSONSource | undefined;
  source?.setData(collection);
}

export function updateAirportContextVisibility(map: MapLibreMap, enabled: boolean): void {
  const visibility = enabled ? "visible" : "none";
  for (const layerId of [airportContextCircleLayerId, airportContextLabelLayerId]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

export function toAirportContextCollection(
  result: AirportContextResponse | null
): AirportContextFeatureCollection {
  if (!result || result.status !== "ok") {
    return emptyAirportContextCollection();
  }

  return {
    type: "FeatureCollection",
    features: result.airports.map((airport) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [airport.longitude, airport.latitude]
      },
      properties: {
        id: airport.id,
        ident: airport.ident,
        label: airport.ident,
        name: airport.name,
        runways: airport.runways.length,
        type: airport.type
      }
    } satisfies Feature<Point>))
  };
}

export function emptyAirportContextCollection(): AirportContextFeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

import type { Aircraft } from "@aisstream/shared";
import type { Feature, FeatureCollection, Geometry, LineString, Point } from "geojson";
import { selectRouteAircraft } from "../routes/routeAircraft";
import { getTrackMetrics, sortTrackPoints } from "../routes/routeMetrics";

export function toAircraftPointCollection(
  aircraft: Aircraft[],
  selectedAircraftId: string | null,
  watchedAircraftIds: Set<string> = new Set()
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: aircraft.map((item): Feature<Point> => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude]
      },
      properties: {
        id: item.id,
        label: aircraftLabel(item),
        classification: item.classification,
        emergency: item.emergency ? 1 : 0,
        riskLevel: item.riskLevel,
        speed: item.groundSpeedKt ?? 0,
        altitude: item.altitudeFt ?? 0,
        bearing: item.trackDegrees ?? 0,
        selected: item.id === selectedAircraftId ? 1 : 0,
        watched: watchedAircraftIds.has(item.id) ? 1 : 0
      }
    }))
  };
}

export function toAircraftTrackCollection(
  aircraft: Aircraft[],
  selectedAircraftId: string | null,
  options: { includeAll?: boolean } = {}
): FeatureCollection<LineString> {
  const trackedAircraft = selectVisibleTrackedAircraft(aircraft, selectedAircraftId, options);

  return {
    type: "FeatureCollection",
    features: trackedAircraft.map((item): Feature<LineString> => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: sortTrackPoints(item.track).map((point) => [point.longitude, point.latitude])
      },
      properties: {
        id: item.id,
        classification: item.classification,
        emergency: item.emergency ? 1 : 0,
        riskLevel: item.riskLevel,
        selected: item.id === selectedAircraftId ? 1 : 0
      }
    }))
  };
}

export function toAircraftTrackMarkerCollection(
  aircraft: Aircraft[],
  selectedAircraftId: string | null,
  options: { includeAll?: boolean } = {}
): FeatureCollection<Point> {
  const trackedAircraft = selectVisibleTrackedAircraft(aircraft, selectedAircraftId, options);

  return {
    type: "FeatureCollection",
    features: trackedAircraft.flatMap((item): Array<Feature<Point>> => {
      const metrics = getTrackMetrics(item.track);

      if (!metrics) {
        return [];
      }

      return [
        toAircraftTrackMarker(item, metrics.start, "start", selectedAircraftId),
        toAircraftTrackMarker(item, metrics.end, "latest", selectedAircraftId)
      ];
    })
  };
}

export function emptyAircraftFeatureCollection<TGeometry extends Geometry>(): FeatureCollection<TGeometry> {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
}

function selectVisibleTrackedAircraft(
  aircraft: Aircraft[],
  selectedAircraftId: string | null,
  options: { includeAll?: boolean }
): Aircraft[] {
  return options.includeAll
    ? selectRouteAircraft(aircraft, { selectedAircraftId })
    : aircraft.filter((item) => item.id === selectedAircraftId && item.track.length > 1);
}

function toAircraftTrackMarker(
  aircraft: Aircraft,
  point: Aircraft["track"][number],
  marker: "latest" | "start",
  selectedAircraftId: string | null
): Feature<Point> {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude]
    },
    properties: {
      id: aircraft.id,
      classification: aircraft.classification,
      emergency: aircraft.emergency ? 1 : 0,
      marker,
      riskLevel: aircraft.riskLevel,
      selected: aircraft.id === selectedAircraftId ? 1 : 0,
      timestamp: point.timestamp
    }
  };
}

import { classifyVessel, type RiskLevel, type Vessel } from "@aisstream/shared";
import type { Feature, FeatureCollection, Geometry, LineString, Point } from "geojson";
import { getRouteMetrics, sortTrackPoints } from "../routes/routeMetrics";
import { selectRouteVessels } from "../routes/routeVessels";

export function toPointCollection(
  vessels: Vessel[],
  selectedVesselId: string | null,
  watchedVesselIds: Set<string> = new Set()
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: vessels.map((vessel): Feature<Point> => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [vessel.longitude, vessel.latitude]
      },
      properties: {
        id: vessel.id,
        name: vessel.name,
        classification: classifyVessel(vessel),
        riskLevel: vessel.riskLevel satisfies RiskLevel,
        speed: vessel.speedOverGround,
        bearing: vessel.heading ?? vessel.courseOverGround,
        selected: vessel.id === selectedVesselId ? 1 : 0,
        watched: watchedVesselIds.has(vessel.id) ? 1 : 0
      }
    }))
  };
}

export function toRouteTrackCollection(
  vessels: Vessel[],
  selectedVesselId: string | null,
  options: { includeAll?: boolean } = {}
): FeatureCollection<LineString> {
  const routeVessels = selectVisibleRouteVessels(vessels, selectedVesselId, options);

  return {
    type: "FeatureCollection",
    features: routeVessels.map((vessel): Feature<LineString> => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: sortTrackPoints(vessel.track).map((point) => [point.longitude, point.latitude])
      },
      properties: {
        id: vessel.id,
        riskLevel: vessel.riskLevel,
        selected: vessel.id === selectedVesselId ? 1 : 0
      }
    }))
  };
}

export function toRouteMarkerCollection(
  vessels: Vessel[],
  selectedVesselId: string | null,
  options: { includeAll?: boolean } = {}
): FeatureCollection<Point> {
  const routeVessels = selectVisibleRouteVessels(vessels, selectedVesselId, options);

  return {
    type: "FeatureCollection",
    features: routeVessels.flatMap((vessel): Array<Feature<Point>> => {
      const metrics = getRouteMetrics(vessel);

      if (!metrics) {
        return [];
      }

      return [
        toTrackMarker(vessel, metrics.start, "start", selectedVesselId),
        toTrackMarker(vessel, metrics.end, "latest", selectedVesselId)
      ];
    })
  };
}

export function emptyFeatureCollection<TGeometry extends Geometry>(): FeatureCollection<TGeometry> {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function selectVisibleRouteVessels(
  vessels: Vessel[],
  selectedVesselId: string | null,
  options: { includeAll?: boolean }
): Vessel[] {
  return options.includeAll
    ? selectRouteVessels(vessels, { selectedVesselId })
    : vessels.filter((vessel) => vessel.id === selectedVesselId && vessel.track.length > 1);
}

function toTrackMarker(
  vessel: Vessel,
  point: Vessel["track"][number],
  marker: "latest" | "start",
  selectedVesselId: string | null
): Feature<Point> {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude]
    },
    properties: {
      id: vessel.id,
      marker,
      riskLevel: vessel.riskLevel,
      selected: vessel.id === selectedVesselId ? 1 : 0,
      timestamp: point.timestamp
    }
  };
}

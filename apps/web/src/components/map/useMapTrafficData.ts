import type { LineString, Point } from "geojson";
import { useMemo } from "react";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useVesselStore } from "../../stores/vesselStore";
import { useVisibleTraffic } from "../../hooks/useVisibleTraffic";
import {
  isDomainIncluded,
  matchingWatchedIds
} from "../../traffic/trafficFilters";
import {
  emptyAircraftFeatureCollection,
  toAircraftPointCollection,
  toAircraftTrackCollection,
  toAircraftTrackMarkerCollection
} from "./aircraftMapData";
import {
  emptyFeatureCollection,
  toPointCollection,
  toRouteMarkerCollection,
  toRouteTrackCollection
} from "./vesselMapData";

export function useMapTrafficData(showRoutes: boolean) {
  const selectedVesselId = useVesselStore((state) => state.selectedVesselId);
  const selectedAircraftId = useAircraftStore((state) => state.selectedAircraftId);
  const { activeRules, aircraft, vessels, visibleAircraft, visibleVessels } = useVisibleTraffic();
  const watchedVesselIds = useMemo(
    () =>
      matchingWatchedIds(
        vessels,
        activeRules
          .filter((rule) => isDomainIncluded("vessel", rule.domain))
          .map((rule) => rule.area.bounds)
      ),
    [activeRules, vessels]
  );
  const watchedAircraftIds = useMemo(
    () =>
      matchingWatchedIds(
        aircraft,
        activeRules
          .filter((rule) => isDomainIncluded("aircraft", rule.domain))
          .map((rule) => rule.area.bounds)
      ),
    [activeRules, aircraft]
  );
  const pointData = useMemo(
    () => toPointCollection(visibleVessels, selectedVesselId, watchedVesselIds),
    [selectedVesselId, visibleVessels, watchedVesselIds]
  );
  const trackData = useMemo(
    () =>
      selectedVesselId || showRoutes
        ? toRouteTrackCollection(visibleVessels, selectedVesselId, { includeAll: showRoutes })
        : emptyFeatureCollection<LineString>(),
    [selectedVesselId, showRoutes, visibleVessels]
  );
  const trackMarkerData = useMemo(
    () =>
      selectedVesselId || showRoutes
        ? toRouteMarkerCollection(visibleVessels, selectedVesselId, { includeAll: showRoutes })
        : emptyFeatureCollection<Point>(),
    [selectedVesselId, showRoutes, visibleVessels]
  );
  const aircraftPointData = useMemo(
    () => toAircraftPointCollection(visibleAircraft, selectedAircraftId, watchedAircraftIds),
    [selectedAircraftId, visibleAircraft, watchedAircraftIds]
  );
  const aircraftTrackData = useMemo(
    () =>
      selectedAircraftId || showRoutes
        ? toAircraftTrackCollection(visibleAircraft, selectedAircraftId, { includeAll: showRoutes })
        : emptyAircraftFeatureCollection<LineString>(),
    [selectedAircraftId, showRoutes, visibleAircraft]
  );
  const aircraftTrackMarkerData = useMemo(
    () =>
      selectedAircraftId || showRoutes
        ? toAircraftTrackMarkerCollection(visibleAircraft, selectedAircraftId, {
            includeAll: showRoutes
          })
        : emptyAircraftFeatureCollection<Point>(),
    [selectedAircraftId, showRoutes, visibleAircraft]
  );

  return {
    aircraft,
    aircraftPointData,
    aircraftTrackData,
    aircraftTrackMarkerData,
    pointData,
    trackMarkerData,
    trackData,
    vessels
  };
}

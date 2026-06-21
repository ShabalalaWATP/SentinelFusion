import type { Aircraft } from "@aisstream/shared";
import { getTrackMetrics } from "./routeMetrics";

const maxRouteAircraft = 40;

type RouteAircraftOptions = {
  limit?: number;
  selectedAircraftId?: string | null;
};

export function selectRouteAircraft(
  aircraft: Aircraft[],
  options: RouteAircraftOptions = {}
): Aircraft[] {
  const limit = options.limit ?? maxRouteAircraft;
  const sortedRoutes = aircraft.filter(hasAircraftTrack).sort(compareRouteAircraft);
  const limitedRoutes = sortedRoutes.slice(0, limit);
  const selectedRoute = sortedRoutes.find((item) => item.id === options.selectedAircraftId);

  if (!selectedRoute || limitedRoutes.some((item) => item.id === selectedRoute.id)) {
    return limitedRoutes;
  }

  return [...limitedRoutes, selectedRoute];
}

function hasAircraftTrack(aircraft: Pick<Aircraft, "track">): boolean {
  return aircraft.track.length > 1;
}

function compareRouteAircraft(left: Aircraft, right: Aircraft): number {
  const rightDistance = getTrackMetrics(right.track)?.distanceNm ?? 0;
  const leftDistance = getTrackMetrics(left.track)?.distanceNm ?? 0;

  if (rightDistance !== leftDistance) {
    return rightDistance - leftDistance;
  }

  return (right.groundSpeedKt ?? 0) - (left.groundSpeedKt ?? 0);
}

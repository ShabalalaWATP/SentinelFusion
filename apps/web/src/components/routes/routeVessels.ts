import type { Vessel } from "@aisstream/shared";
import { getRouteMetrics } from "./routeMetrics";

const maxRouteVessels = 10;

type RouteVesselOptions = {
  limit?: number;
  selectedVesselId?: string | null;
};

export function selectRouteVessels(
  vessels: Vessel[],
  options: RouteVesselOptions = {}
): Vessel[] {
  const limit = options.limit ?? maxRouteVessels;
  const sortedRoutes = vessels.filter(hasRouteTrack).sort(compareRouteVessels);
  const limitedRoutes = sortedRoutes.slice(0, limit);
  const selectedRoute = sortedRoutes.find((vessel) => vessel.id === options.selectedVesselId);

  if (!selectedRoute || limitedRoutes.some((vessel) => vessel.id === selectedRoute.id)) {
    return limitedRoutes;
  }

  return [...limitedRoutes, selectedRoute];
}

export function hasRouteTrack(vessel: Pick<Vessel, "track">): boolean {
  return vessel.track.length > 1;
}

function compareRouteVessels(left: Vessel, right: Vessel): number {
  const rightDistance = getRouteMetrics(right)?.distanceNm ?? 0;
  const leftDistance = getRouteMetrics(left)?.distanceNm ?? 0;

  if (rightDistance !== leftDistance) {
    return rightDistance - leftDistance;
  }

  return right.speedOverGround - left.speedOverGround;
}

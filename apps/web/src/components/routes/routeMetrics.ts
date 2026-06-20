import type { Vessel } from "@aisstream/shared";

const earthRadiusNm = 3440.065;
type VesselTrackPoint = Vessel["track"][number];
export type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

export type RouteMetrics<TPoint extends TrackPoint = VesselTrackPoint> = {
  distanceNm: number;
  elapsedMinutes: number;
  pointCount: number;
  startedAt: string;
  endedAt: string;
  start: TPoint;
  end: TPoint;
};

export function getRouteMetrics(vessel: Vessel): RouteMetrics | null {
  return getTrackMetrics(vessel.track);
}

export function getTrackMetrics<TPoint extends TrackPoint>(
  track: TPoint[]
): RouteMetrics<TPoint> | null {
  if (track.length < 2) {
    return null;
  }

  const sortedTrack = sortTrackPoints(track);
  const start = sortedTrack[0];
  const end = sortedTrack[sortedTrack.length - 1];

  if (!start || !end) {
    return null;
  }

  const distanceNm = sortedTrack.slice(1).reduce((total, point, index) => {
    const previous = sortedTrack[index];
    return previous ? total + distanceBetween(previous, point) : total;
  }, 0);
  const elapsedMinutes = Math.max(
    0,
    (new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000
  );

  return {
    distanceNm,
    elapsedMinutes,
    pointCount: sortedTrack.length,
    startedAt: start.timestamp,
    endedAt: end.timestamp,
    start,
    end
  };
}

export function sortTrackPoints<TPoint extends TrackPoint>(track: TPoint[]): TPoint[] {
  return [...track].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}

export function formatDistanceNm(distanceNm: number): string {
  if (distanceNm < 0.1) {
    return "<0.1 nm";
  }

  return `${distanceNm.toFixed(1)} nm`;
}

export function formatElapsedMinutes(minutes: number): string {
  if (minutes < 1) {
    return "<1 min";
  }

  if (minutes < 90) {
    return `${Math.round(minutes)} min`;
  }

  return `${(minutes / 60).toFixed(1)} hr`;
}

function distanceBetween(left: TrackPoint, right: TrackPoint): number {
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusNm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

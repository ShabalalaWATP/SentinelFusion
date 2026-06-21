import type { TrafficAreaBounds } from "@aisstream/shared";

export const maxConflictContextLatitudeSpan = 40;
export const maxConflictContextLongitudeSpan = 80;
export const maxConflictContextAreaDegrees = 1600;
export const conflictContextCacheBucketDegrees = 0.25;
export const maxConflictJsonBytes = 2_000_000;
export const maxConflictProviderRows = 1000;

export function conflictContextAreaLimitError(bounds: TrafficAreaBounds): string | null {
  const latitudeSpan = bounds.north - bounds.south;
  const longitudeSpan = longitudeSpanDegrees(bounds);
  const areaDegrees = latitudeSpan * longitudeSpan;

  if (latitudeSpan > maxConflictContextLatitudeSpan) {
    return `Conflict context area is too tall. Maximum latitude span is ${maxConflictContextLatitudeSpan} degrees.`;
  }

  if (longitudeSpan > maxConflictContextLongitudeSpan) {
    return `Conflict context area is too wide. Maximum longitude span is ${maxConflictContextLongitudeSpan} degrees.`;
  }

  if (areaDegrees > maxConflictContextAreaDegrees) {
    return `Conflict context area is too large. Maximum area is ${maxConflictContextAreaDegrees} square degrees.`;
  }

  return null;
}

export function bucketConflictContextBounds(bounds: TrafficAreaBounds): TrafficAreaBounds {
  return {
    south: Math.max(-90, roundDown(bounds.south)),
    west: Math.max(-180, roundDown(bounds.west)),
    north: Math.min(90, roundUp(bounds.north)),
    east: Math.min(180, roundUp(bounds.east))
  };
}

export function isCoordinateInsideBounds(
  coordinate: { latitude: number; longitude: number },
  bounds: TrafficAreaBounds
): boolean {
  const latitudeInside = coordinate.latitude >= bounds.south && coordinate.latitude <= bounds.north;
  const longitudeInside =
    bounds.west <= bounds.east
      ? coordinate.longitude >= bounds.west && coordinate.longitude <= bounds.east
      : coordinate.longitude >= bounds.west || coordinate.longitude <= bounds.east;

  return latitudeInside && longitudeInside;
}

export function splitAntimeridianBounds(bounds: TrafficAreaBounds): TrafficAreaBounds[] {
  if (bounds.west <= bounds.east) {
    return [bounds];
  }

  return [
    { ...bounds, east: 180 },
    { ...bounds, west: -180 }
  ];
}

function longitudeSpanDegrees(bounds: TrafficAreaBounds): number {
  return bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
}

function roundDown(value: number): number {
  return Math.floor(value / conflictContextCacheBucketDegrees) * conflictContextCacheBucketDegrees;
}

function roundUp(value: number): number {
  return Math.ceil(value / conflictContextCacheBucketDegrees) * conflictContextCacheBucketDegrees;
}

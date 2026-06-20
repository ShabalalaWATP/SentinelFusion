import type { TrafficAreaBounds } from "@aisstream/shared";

export const maxFireContextLatitudeSpan = 30;
export const maxFireContextLongitudeSpan = 60;
export const maxFireContextAreaDegrees = 900;
export const fireContextCacheBucketDegrees = 0.1;
export const maxFirmsCsvBytes = 1_000_000;
export const maxFirmsCsvRows = 2000;

export function fireContextAreaLimitError(bounds: TrafficAreaBounds): string | null {
  const latitudeSpan = bounds.north - bounds.south;
  const longitudeSpan = longitudeSpanDegrees(bounds);
  const areaDegrees = latitudeSpan * longitudeSpan;

  if (latitudeSpan > maxFireContextLatitudeSpan) {
    return `Fire context area is too tall. Maximum latitude span is ${maxFireContextLatitudeSpan} degrees.`;
  }

  if (longitudeSpan > maxFireContextLongitudeSpan) {
    return `Fire context area is too wide. Maximum longitude span is ${maxFireContextLongitudeSpan} degrees.`;
  }

  if (areaDegrees > maxFireContextAreaDegrees) {
    return `Fire context area is too large. Maximum area is ${maxFireContextAreaDegrees} square degrees.`;
  }

  return null;
}

export function bucketFireContextBounds(bounds: TrafficAreaBounds): TrafficAreaBounds {
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

function longitudeSpanDegrees(bounds: TrafficAreaBounds): number {
  return bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
}

function roundDown(value: number): number {
  return Math.floor(value / fireContextCacheBucketDegrees) * fireContextCacheBucketDegrees;
}

function roundUp(value: number): number {
  return Math.ceil(value / fireContextCacheBucketDegrees) * fireContextCacheBucketDegrees;
}

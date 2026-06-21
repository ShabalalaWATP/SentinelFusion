import type { TrafficAreaBounds } from "@aisstream/shared";

export const maxAirportContextLatitudeSpan = 45;
export const maxAirportContextLongitudeSpan = 90;
export const maxAirportContextAreaDegrees = 2500;
export const maxAirportsCsvBytes = 20_000_000;
export const maxRunwaysCsvBytes = 8_000_000;
export const maxAirportCsvRows = 120_000;
export const maxRunwayCsvRows = 100_000;
export const maxAirportSearchRadiusKm = 1000;
export const defaultAirportSearchRadiusKm = 250;

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function airportContextAreaLimitError(bounds: TrafficAreaBounds): string | null {
  const latitudeSpan = bounds.north - bounds.south;
  const longitudeSpan = longitudeSpanDegrees(bounds);
  const areaDegrees = latitudeSpan * longitudeSpan;

  if (latitudeSpan > maxAirportContextLatitudeSpan) {
    return `Airport context area is too tall. Select ${maxAirportContextLatitudeSpan} degrees of latitude or less.`;
  }

  if (longitudeSpan > maxAirportContextLongitudeSpan) {
    return `Airport context area is too wide. Select ${maxAirportContextLongitudeSpan} degrees of longitude or less.`;
  }

  if (areaDegrees > maxAirportContextAreaDegrees) {
    return `Airport context area is too large. Select ${maxAirportContextAreaDegrees} square degrees or less.`;
  }

  return null;
}

export function centreOfBounds(bounds: TrafficAreaBounds): GeoPoint {
  const latitude = (bounds.south + bounds.north) / 2;
  const longitude =
    bounds.west <= bounds.east
      ? (bounds.west + bounds.east) / 2
      : normaliseLongitude((bounds.west + bounds.east + 360) / 2);

  return { latitude, longitude };
}

export function isPointInsideBounds(point: GeoPoint, bounds: TrafficAreaBounds): boolean {
  const latitudeMatches = point.latitude >= bounds.south && point.latitude <= bounds.north;
  const longitudeMatches =
    bounds.west <= bounds.east
      ? point.longitude >= bounds.west && point.longitude <= bounds.east
      : point.longitude >= bounds.west || point.longitude <= bounds.east;

  return latitudeMatches && longitudeMatches;
}

export function distanceKm(left: GeoPoint, right: GeoPoint): number {
  const radiusKm = 6371;
  const deltaLatitude = degreesToRadians(right.latitude - left.latitude);
  const deltaLongitude = degreesToRadians(right.longitude - left.longitude);
  const leftLatitude = degreesToRadians(left.latitude);
  const rightLatitude = degreesToRadians(right.latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);
  const deltaLongitude = degreesToRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(deltaLongitude);

  return (radiansToDegrees(Math.atan2(y, x)) + 360) % 360;
}

function longitudeSpanDegrees(bounds: TrafficAreaBounds): number {
  return bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
}

function normaliseLongitude(value: number): number {
  if (value > 180) {
    return value - 360;
  }

  if (value < -180) {
    return value + 360;
  }

  return value;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

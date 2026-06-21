import type { TrafficAreaBounds } from "@aisstream/shared";

const maxSatelliteLatitudeSpan = 20;
const maxSatelliteLongitudeSpan = 40;
const maxSatelliteAreaDegrees = 400;

export function satelliteContextAreaLimitError(bounds: TrafficAreaBounds): string | null {
  const latitudeSpan = Math.abs(bounds.north - bounds.south);
  const longitudeSpan = Math.abs(bounds.east - bounds.west);
  const area = latitudeSpan * longitudeSpan;

  if (bounds.west > bounds.east) {
    return "Satellite snapshots do not yet support antimeridian-crossing areas.";
  }

  if (latitudeSpan > maxSatelliteLatitudeSpan) {
    return `Satellite area is too tall for snapshot lookup. Maximum latitude span is ${maxSatelliteLatitudeSpan} degrees.`;
  }

  if (longitudeSpan > maxSatelliteLongitudeSpan) {
    return `Satellite area is too wide for snapshot lookup. Maximum longitude span is ${maxSatelliteLongitudeSpan} degrees.`;
  }

  if (area > maxSatelliteAreaDegrees) {
    return `Satellite area is too large for snapshot lookup. Maximum area is ${maxSatelliteAreaDegrees} square degrees.`;
  }

  return null;
}

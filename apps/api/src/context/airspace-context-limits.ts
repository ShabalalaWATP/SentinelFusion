import type { TrafficAreaBounds } from "@aisstream/shared";

export const maxAirspaceLatitudeSpan = 45;
export const maxAirspaceLongitudeSpan = 90;
export const maxAirspaceAreaDegrees = 2500;

export function airspaceContextAreaLimitError(bounds: TrafficAreaBounds): string | null {
  const latitudeSpan = Math.abs(bounds.north - bounds.south);
  const longitudeSpan = Math.abs(bounds.east - bounds.west);
  const area = latitudeSpan * longitudeSpan;

  if (latitudeSpan > maxAirspaceLatitudeSpan) {
    return `Airspace area is too tall for provider lookup. Maximum latitude span is ${maxAirspaceLatitudeSpan} degrees.`;
  }

  if (longitudeSpan > maxAirspaceLongitudeSpan) {
    return `Airspace area is too wide for provider lookup. Maximum longitude span is ${maxAirspaceLongitudeSpan} degrees.`;
  }

  if (area > maxAirspaceAreaDegrees) {
    return `Airspace area is too large for provider lookup. Maximum area is ${maxAirspaceAreaDegrees} square degrees.`;
  }

  return null;
}

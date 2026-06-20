import type { Aircraft } from "@aisstream/shared";
import { classifyAircraft } from "@aisstream/shared";

const metresToFeet = 3.28084;
const metresPerSecondToKnots = 1.94384;
const metresPerSecondToFeetPerMinute = 196.850394;
const emergencySquawks = new Set(["7500", "7600", "7700"]);

export type AircraftTrackState = Map<string, Aircraft["track"]>;

export function buildAircraftTrack(
  aircraft: Omit<Aircraft, "track">,
  tracks: AircraftTrackState
): Aircraft["track"] {
  const previous = tracks.get(aircraft.id) ?? [];
  const nextPoint = {
    longitude: aircraft.longitude,
    latitude: aircraft.latitude,
    ...(aircraft.altitudeFt !== undefined ? { altitudeFt: aircraft.altitudeFt } : {}),
    timestamp: aircraft.lastUpdated
  };
  const last = previous.at(-1);
  const nextTrack =
    last &&
    last.longitude === nextPoint.longitude &&
    last.latitude === nextPoint.latitude &&
    last.timestamp === nextPoint.timestamp
      ? previous
      : [...previous, nextPoint].slice(-120);

  tracks.set(aircraft.id, nextTrack);
  return nextTrack;
}

export function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function boundedNumber(
  value: unknown,
  min: number,
  max: number
): number | undefined {
  const number = finiteNumber(value);
  return number === undefined || number < min || number > max ? undefined : number;
}

export function boundedLatitude(value: unknown): number | undefined {
  return boundedNumber(value, -90, 90);
}

export function boundedLongitude(value: unknown): number | undefined {
  return boundedNumber(value, -180, 180);
}

export function metresAltitudeToFeet(value: unknown): number | undefined {
  const metres = finiteNumber(value);
  if (metres === undefined) {
    return undefined;
  }

  const feet = Math.round(metres * metresToFeet);
  return feet < -1500 || feet > 100000 ? undefined : feet;
}

export function metresPerSecondToKt(value: unknown): number | undefined {
  const metresPerSecond = finiteNumber(value);
  if (metresPerSecond === undefined) {
    return undefined;
  }

  const knots = Number((metresPerSecond * metresPerSecondToKnots).toFixed(1));
  return knots < 0 || knots > 1200 ? undefined : knots;
}

export function metresPerSecondToFpm(value: unknown): number | undefined {
  const metresPerSecond = finiteNumber(value);
  if (metresPerSecond === undefined) {
    return undefined;
  }

  const fpm = Math.round(metresPerSecond * metresPerSecondToFeetPerMinute);
  return fpm < -20000 || fpm > 20000 ? undefined : fpm;
}

export function timestampFromSeconds(value: unknown, fallback: Date): string {
  const seconds = finiteNumber(value);
  return seconds === undefined
    ? fallback.toISOString()
    : new Date(seconds * 1000).toISOString();
}

export function timestampFromMilliseconds(value: unknown, fallback: Date): string {
  const milliseconds = finiteNumber(value);
  return milliseconds === undefined
    ? fallback.toISOString()
    : new Date(milliseconds).toISOString();
}

export function normaliseHeading(value: unknown): number | undefined {
  const heading = finiteNumber(value);
  if (heading === undefined) {
    return undefined;
  }

  return Math.max(0, Math.min(360, heading));
}

export function isEmergencySquawk(squawk: string | undefined): boolean {
  return squawk ? emergencySquawks.has(squawk) : false;
}

export function classifyAndRisk(aircraft: {
  aircraftType?: string;
  callsign?: string;
  category?: string;
  emergency: boolean;
  operator?: string;
  registration?: string;
}): Pick<Aircraft, "classification" | "riskLevel"> {
  const classification = classifyAircraft(aircraft);
  const riskLevel = aircraft.emergency
    ? "high"
    : classification === "military"
      ? "medium"
      : "low";

  return { classification, riskLevel };
}

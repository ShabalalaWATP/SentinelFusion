import type { Aircraft } from "@aisstream/shared";
import type { FlightStreamLifecycleEvent, IFlightTrackingClient } from "../domain/interfaces";

type SampleAircraft = Omit<Aircraft, "lastUpdated" | "track"> & {
  altitudeStepFt: number;
  longitudeStep: number;
  latitudeStep: number;
};

export class MockFlightTrackingClient implements IFlightTrackingClient {
  private readonly samples: SampleAircraft[] = createSampleAircraft();

  constructor(private readonly intervalMs: number) {}

  subscribe(
    onAircraft: (aircraft: Aircraft[]) => void,
    onEvent?: (event: FlightStreamLifecycleEvent) => void
  ): () => void {
    let tick = 0;
    onEvent?.({ type: "state", state: "subscribed", connected: true });

    const emit = (): void => {
      const now = new Date();
      const aircraft = this.samples.map((sample) => projectAircraft(sample, tick, now));
      tick += 1;
      onEvent?.({ type: "message", sourceTimestamp: now.toISOString() });
      onAircraft(aircraft);
    };

    emit();
    const timer = setInterval(emit, this.intervalMs);

    return () => {
      clearInterval(timer);
      onEvent?.({ type: "state", state: "closed", connected: false });
    };
  }
}

function projectAircraft(sample: SampleAircraft, tick: number, now: Date): Aircraft {
  const aircraft = toPublishedAircraft(sample);
  const position = projectPosition(sample, tick);
  const longitude = position.longitude;
  const latitude = position.latitude;
  const altitudeFt = sample.onGround
    ? 0
    : Math.max(0, (sample.altitudeFt ?? 0) + sample.altitudeStepFt * position.phase);
  const timestamp = now.toISOString();
  const track = Array.from({ length: Math.min(tick + 1, 12) }, (_, index) => {
    const step = tick - (Math.min(tick, 11) - index);
    const projected = projectPosition(sample, step);
    return {
      longitude: projected.longitude,
      latitude: projected.latitude,
      altitudeFt: sample.onGround
        ? 0
        : Math.max(0, (sample.altitudeFt ?? 0) + sample.altitudeStepFt * projected.phase),
      timestamp
    };
  });

  return {
    ...aircraft,
    longitude,
    latitude,
    altitudeFt,
    lastUpdated: timestamp,
    track
  };
}

function projectPosition(sample: SampleAircraft, tick: number): {
  latitude: number;
  longitude: number;
  phase: number;
} {
  const phase = triangleWave(tick, 120);

  return {
    longitude: normaliseLongitude(sample.longitude + sample.longitudeStep * phase),
    latitude: clamp(sample.latitude + sample.latitudeStep * phase, -89.9, 89.9),
    phase
  };
}

function toPublishedAircraft(sample: SampleAircraft): Omit<Aircraft, "lastUpdated" | "track"> {
  return {
    id: sample.id,
    icao24: sample.icao24,
    ...(sample.callsign ? { callsign: sample.callsign } : {}),
    ...(sample.registration ? { registration: sample.registration } : {}),
    ...(sample.aircraftType ? { aircraftType: sample.aircraftType } : {}),
    ...(sample.operator ? { operator: sample.operator } : {}),
    ...(sample.originCountry ? { originCountry: sample.originCountry } : {}),
    ...(sample.originAirport ? { originAirport: sample.originAirport } : {}),
    ...(sample.destinationAirport ? { destinationAirport: sample.destinationAirport } : {}),
    longitude: sample.longitude,
    latitude: sample.latitude,
    ...(sample.altitudeFt !== undefined ? { altitudeFt: sample.altitudeFt } : {}),
    ...(sample.geoAltitudeFt !== undefined ? { geoAltitudeFt: sample.geoAltitudeFt } : {}),
    ...(sample.groundSpeedKt !== undefined ? { groundSpeedKt: sample.groundSpeedKt } : {}),
    ...(sample.trackDegrees !== undefined ? { trackDegrees: sample.trackDegrees } : {}),
    ...(sample.verticalRateFpm !== undefined ? { verticalRateFpm: sample.verticalRateFpm } : {}),
    ...(sample.squawk ? { squawk: sample.squawk } : {}),
    emergency: sample.emergency,
    onGround: sample.onGround,
    ...(sample.category ? { category: sample.category } : {}),
    classification: sample.classification,
    riskLevel: sample.riskLevel,
    source: sample.source
  };
}

function createSampleAircraft(): SampleAircraft[] {
  return [
    {
      id: "icao24-40621b",
      icao24: "40621b",
      callsign: "BAW12",
      registration: "G-STBA",
      aircraftType: "Boeing 777-300ER",
      operator: "British Airways",
      originCountry: "United Kingdom",
      originAirport: "EGLL",
      destinationAirport: "KJFK",
      longitude: -1.1,
      latitude: 50.95,
      altitudeFt: 34000,
      groundSpeedKt: 452,
      trackDegrees: 282,
      verticalRateFpm: 0,
      squawk: "4451",
      emergency: false,
      onGround: false,
      category: "Heavy",
      classification: "commercial",
      riskLevel: "low",
      source: "mock",
      altitudeStepFt: 0,
      longitudeStep: -0.035,
      latitudeStep: 0.006
    },
    {
      id: "icao24-43c6f1",
      icao24: "43c6f1",
      callsign: "RFR7182",
      registration: "ZZ343",
      aircraftType: "Airbus A400M Atlas",
      operator: "Royal Air Force",
      originCountry: "United Kingdom",
      longitude: -1.75,
      latitude: 51.2,
      altitudeFt: 18000,
      groundSpeedKt: 310,
      trackDegrees: 138,
      verticalRateFpm: 300,
      squawk: "7001",
      emergency: false,
      onGround: false,
      category: "Military transport",
      classification: "military",
      riskLevel: "medium",
      source: "mock",
      altitudeStepFt: 120,
      longitudeStep: 0.018,
      latitudeStep: -0.018
    },
    {
      id: "icao24-400999",
      icao24: "400999",
      callsign: "NPAS42",
      aircraftType: "Police helicopter",
      operator: "National Police Air Service",
      originCountry: "United Kingdom",
      longitude: -0.98,
      latitude: 50.82,
      altitudeFt: 1800,
      groundSpeedKt: 92,
      trackDegrees: 76,
      verticalRateFpm: -80,
      squawk: "0037",
      emergency: false,
      onGround: false,
      category: "Rotorcraft",
      classification: "government",
      riskLevel: "low",
      source: "mock",
      altitudeStepFt: -5,
      longitudeStep: 0.012,
      latitudeStep: 0.004
    },
    {
      id: "icao24-4d2222",
      icao24: "4d2222",
      callsign: "MEDIC7",
      aircraftType: "Air ambulance helicopter",
      operator: "Air Ambulance",
      originCountry: "United Kingdom",
      longitude: -2.1,
      latitude: 51.05,
      altitudeFt: 2200,
      groundSpeedKt: 125,
      trackDegrees: 42,
      verticalRateFpm: -400,
      squawk: "7700",
      emergency: true,
      onGround: false,
      category: "Rotorcraft",
      classification: "government",
      riskLevel: "high",
      source: "mock",
      altitudeStepFt: -30,
      longitudeStep: 0.016,
      latitudeStep: 0.011
    }
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function triangleWave(tick: number, amplitude: number): number {
  const period = amplitude * 2;
  const position = positiveModulo(tick, period);
  return position <= amplitude ? position : period - position;
}

export function normaliseLongitude(value: number): number {
  const normalised = positiveModulo(value + 180, 360) - 180;
  return normalised === -180 ? 180 : normalised;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

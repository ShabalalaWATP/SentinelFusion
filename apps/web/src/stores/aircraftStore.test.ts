import { describe, expect, it } from "vitest";
import type { Aircraft, AircraftMetrics, FlightStreamStatus } from "@aisstream/shared";
import {
  selectAircraftList,
  selectSelectedAircraft,
  useAircraftStore
} from "./aircraftStore";

const timestamp = "2026-06-11T10:00:00.000Z";

const aircraft: Aircraft = {
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
  lastUpdated: timestamp,
  track: [{ longitude: -1.75, latitude: 51.2, altitudeFt: 18000, timestamp }]
};

const metrics: AircraftMetrics = {
  liveAircraft: 1,
  trackedAircraft: 1,
  militaryAircraft: 1,
  emergencyAircraft: 0,
  averageAltitudeFt: 18000,
  averageGroundSpeedKt: 310,
  dataLatencyMs: 100,
  lastUpdated: timestamp
};

const streamStatus: FlightStreamStatus = {
  mode: "live",
  provider: "opensky",
  state: "subscribed",
  connected: true,
  aircraftReceived: 0,
  aircraftNormalised: 0,
  aircraftDropped: 0,
  errors: 1,
  reconnectAttempts: 0,
  lastError: "OpenSky rate limit exhausted; retrying after 120 seconds.",
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]]
  }
};

describe("aircraftStore", () => {
  it("applies snapshots and selected aircraft state", () => {
    useAircraftStore.setState({
      aircraft: {},
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });

    useAircraftStore.getState().setSnapshot([aircraft], metrics, streamStatus);
    useAircraftStore.getState().selectAircraft(aircraft.id);

    const state = useAircraftStore.getState();
    expect(selectAircraftList(state)).toHaveLength(1);
    expect(selectSelectedAircraft(state)?.callsign).toBe("RFR7182");
    expect(state.metrics?.militaryAircraft).toBe(1);
    expect(state.streamStatus?.provider).toBe("opensky");
    expect(state.lastError).toBe("OpenSky rate limit exhausted; retrying after 120 seconds.");
  });

  it("merges batched aircraft updates in one state update", () => {
    useAircraftStore.setState({
      aircraft: {},
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });

    const emergencyAircraft: Aircraft = {
      ...aircraft,
      id: "icao24-4d2222",
      icao24: "4d2222",
      callsign: "MEDIC7",
      emergency: true,
      classification: "government",
      riskLevel: "high"
    };

    useAircraftStore.getState().applyEnvelope({
      kind: "batch",
      aircraft: [aircraft, emergencyAircraft],
      metrics: {
        ...metrics,
        liveAircraft: 2,
        trackedAircraft: 2,
        emergencyAircraft: 1
      },
      sentAt: timestamp
    });

    const state = useAircraftStore.getState();
    expect(selectAircraftList(state)).toHaveLength(2);
    expect(state.metrics?.emergencyAircraft).toBe(1);
  });
});

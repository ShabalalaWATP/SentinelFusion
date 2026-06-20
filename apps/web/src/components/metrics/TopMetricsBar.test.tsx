import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AircraftMetrics,
  FlightStreamStatus,
  AisStreamStatus,
  VesselMetrics
} from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useVesselStore } from "../../stores/vesselStore";
import { TopMetricsBar } from "./TopMetricsBar";

const timestamp = "2026-06-11T10:00:00.000Z";

const vesselMetrics: VesselMetrics = {
  liveVessels: 12,
  trackedVessels: 12,
  highRiskVessels: 1,
  averageSpeed: 10,
  dataLatencyMs: 200,
  lastUpdated: timestamp
};

const aircraftMetrics: AircraftMetrics = {
  liveAircraft: 0,
  trackedAircraft: 0,
  militaryAircraft: 0,
  emergencyAircraft: 0,
  averageAltitudeFt: 0,
  averageGroundSpeedKt: 0,
  dataLatencyMs: 0,
  lastUpdated: timestamp
};

const vesselStatus: AisStreamStatus = {
  mode: "live",
  state: "subscribed",
  connected: true,
  messagesReceived: 12,
  messagesNormalised: 12,
  messagesDropped: 0,
  errors: 0,
  reconnectAttempts: 0,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]],
    filtersShipMMSI: [],
    filterMessageTypes: ["PositionReport"]
  }
};

const flightStatus: FlightStreamStatus = {
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

describe("TopMetricsBar", () => {
  beforeEach(() => {
    cleanup();
    useMapStore.setState({ domainFilter: "all" });
    useVesselStore.setState({
      vessels: {},
      selectedVesselId: null,
      metrics: vesselMetrics,
      streamStatus: vesselStatus,
      connectionStatus: "open",
      lastError: null
    });
    useAircraftStore.setState({
      aircraft: {},
      selectedAircraftId: null,
      metrics: aircraftMetrics,
      streamStatus: flightStatus,
      connectionStatus: "open",
      lastError: flightStatus.lastError ?? null
    });
  });

  it("renders live feed modes, provider, and provider errors", () => {
    render(<TopMetricsBar />);

    expect(screen.getByText("Sea live open")).toBeTruthy();
    expect(screen.getByText("Air live opensky open")).toBeTruthy();
    expect(
      screen.getByText("Air: OpenSky rate limit exhausted; retrying after 120 seconds.")
    ).toBeTruthy();
  });
});

import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAircraftStore } from "../stores/aircraftStore";
import { useVesselStore } from "../stores/vesselStore";
import { useDashboardData } from "./useDashboardData";

const timestamp = "2026-06-21T10:00:00.000Z";
type RealtimeHandlers = {
  onError(error: Error): void;
  onMessage(envelope: unknown): void;
  onStatus(status: "closed" | "connecting" | "error" | "open"): void;
};

const mocks = vi.hoisted(() => {
  const apiClient = {
    getAircraft: vi.fn(),
    getFlightStatus: vi.fn(),
    getStreamStatus: vi.fn(),
    getVessels: vi.fn()
  };
  const disconnectAircraft = vi.fn();
  const disconnectVessels = vi.fn();
  const flightRealtimeClient = {
    connect: vi.fn(() => disconnectAircraft)
  };
  const realtimeClient = {
    connect: vi.fn(() => disconnectVessels)
  };

  return {
    apiClient,
    disconnectAircraft,
    disconnectVessels,
    flightRealtimeClient,
    realtimeClient
  };
});

vi.mock("../api/apiClient", () => ({ apiClient: mocks.apiClient }));
vi.mock("../realtime/flightRealtimeClient", () => ({
  flightRealtimeClient: mocks.flightRealtimeClient
}));
vi.mock("../realtime/realtimeClient", () => ({
  realtimeClient: mocks.realtimeClient
}));

describe("useDashboardData", () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetStores();
    mocks.apiClient.getVessels.mockResolvedValue({
      vessels: [vessel()],
      metrics: vesselMetrics(),
      stream: streamStatus()
    });
    mocks.apiClient.getAircraft.mockResolvedValue({
      aircraft: [aircraft()],
      metrics: aircraftMetrics(),
      stream: flightStatus()
    });
    mocks.apiClient.getStreamStatus.mockResolvedValue(streamStatus());
    mocks.apiClient.getFlightStatus.mockResolvedValue(flightStatus());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("loads snapshots, wires realtime handlers, refreshes feed status, and cleans up", async () => {
    const { unmount } = render(<DashboardHarness />);

    await flushPromises();

    expect(Object.values(useVesselStore.getState().vessels)).toHaveLength(1);
    expect(Object.values(useAircraftStore.getState().aircraft)).toHaveLength(1);

    expect(mocks.apiClient.getStreamStatus).toHaveBeenCalledTimes(1);
    expect(mocks.apiClient.getFlightStatus).toHaveBeenCalledTimes(1);
    expect(mocks.realtimeClient.connect).toHaveBeenCalledTimes(1);
    expect(mocks.flightRealtimeClient.connect).toHaveBeenCalledTimes(1);

    const vesselHandlers = (
      mocks.realtimeClient.connect.mock.calls as unknown as Array<[RealtimeHandlers]>
    )[0]?.[0];
    const aircraftHandlers = (
      mocks.flightRealtimeClient.connect.mock.calls as unknown as Array<[RealtimeHandlers]>
    )[0]?.[0];

    expect(vesselHandlers).toBeDefined();
    expect(aircraftHandlers).toBeDefined();
    vesselHandlers!.onStatus("open");
    vesselHandlers!.onError(new Error("AIS socket failed"));
    vesselHandlers!.onMessage(vesselEnvelope());
    aircraftHandlers!.onStatus("open");
    aircraftHandlers!.onError(new Error("Flight socket failed"));
    aircraftHandlers!.onMessage(aircraftEnvelope());

    expect(useVesselStore.getState().connectionStatus).toBe("open");
    expect(useVesselStore.getState().lastError).toBe("AIS socket failed");
    expect(useVesselStore.getState().vessels["mmsi-232001245"]?.name).toBe("CELTIC ROUTE");
    expect(useAircraftStore.getState().connectionStatus).toBe("open");
    expect(useAircraftStore.getState().lastError).toBe("Flight socket failed");
    expect(useAircraftStore.getState().aircraft["icao24-40621b"]?.callsign).toBe("BAW123");

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(mocks.apiClient.getStreamStatus).toHaveBeenCalledTimes(2);
    expect(mocks.apiClient.getFlightStatus).toHaveBeenCalledTimes(2);

    unmount();

    expect(mocks.disconnectVessels).toHaveBeenCalledTimes(1);
    expect(mocks.disconnectAircraft).toHaveBeenCalledTimes(1);
  });

  it("records initial load and status refresh errors", async () => {
    mocks.apiClient.getVessels.mockRejectedValue(new Error("Vessel snapshot failed"));
    mocks.apiClient.getAircraft.mockRejectedValue("offline");
    mocks.apiClient.getStreamStatus.mockRejectedValue(new Error("Stream status failed"));
    mocks.apiClient.getFlightStatus.mockRejectedValue("flight status offline");

    render(<DashboardHarness />);

    await flushPromises();

    expect(useVesselStore.getState().lastError).toBe("Stream status failed");
    expect(useAircraftStore.getState().lastError).toBe("Flight stream status failed");
  });

  it("ignores late snapshot and status responses after unmount", async () => {
    let resolveVessels: (value: unknown) => void = () => undefined;
    let resolveAircraft: (value: unknown) => void = () => undefined;
    let resolveStream: (value: unknown) => void = () => undefined;
    let resolveFlight: (value: unknown) => void = () => undefined;
    mocks.apiClient.getVessels.mockReturnValue(new Promise((resolve) => {
      resolveVessels = resolve;
    }));
    mocks.apiClient.getAircraft.mockReturnValue(new Promise((resolve) => {
      resolveAircraft = resolve;
    }));
    mocks.apiClient.getStreamStatus.mockReturnValue(new Promise((resolve) => {
      resolveStream = resolve;
    }));
    mocks.apiClient.getFlightStatus.mockReturnValue(new Promise((resolve) => {
      resolveFlight = resolve;
    }));

    const { unmount } = render(<DashboardHarness />);
    unmount();

    resolveVessels({ vessels: [vessel()], metrics: vesselMetrics(), stream: streamStatus() });
    resolveAircraft({ aircraft: [aircraft()], metrics: aircraftMetrics(), stream: flightStatus() });
    resolveStream(streamStatus());
    resolveFlight(flightStatus());
    await Promise.resolve();

    expect(Object.values(useVesselStore.getState().vessels)).toHaveLength(0);
    expect(Object.values(useAircraftStore.getState().aircraft)).toHaveLength(0);
    expect(useVesselStore.getState().streamStatus).toBeNull();
    expect(useAircraftStore.getState().streamStatus).toBeNull();
  });
});

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function DashboardHarness() {
  useDashboardData();

  return <div>dashboard</div>;
}

function resetStores(): void {
  useVesselStore.setState({
    vessels: {},
    selectedVesselId: null,
    metrics: null,
    streamStatus: null,
    connectionStatus: "closed",
    lastError: null
  });
  useAircraftStore.setState({
    aircraft: {},
    selectedAircraftId: null,
    metrics: null,
    streamStatus: null,
    connectionStatus: "closed",
    lastError: null
  });
}

function vessel() {
  return {
    id: "mmsi-232001234",
    mmsi: "232001234",
    name: "NORTHERN LIGHT",
    shipType: "Cargo",
    longitude: -1.1,
    latitude: 50.8,
    speedOverGround: 12.5,
    courseOverGround: 86,
    destination: "Portsmouth",
    navigationalStatus: "Under way using engine",
    riskLevel: "low",
    lastUpdated: timestamp,
    track: [{ longitude: -1.1, latitude: 50.8, timestamp }]
  };
}

function vesselMetrics() {
  return {
    liveVessels: 1,
    trackedVessels: 1,
    highRiskVessels: 0,
    averageSpeed: 12.5,
    dataLatencyMs: 100,
    lastUpdated: timestamp
  };
}

function streamStatus() {
  return {
    mode: "live",
    state: "subscribed",
    connected: true,
    messagesReceived: 10,
    messagesNormalised: 9,
    messagesDropped: 1,
    errors: 0,
    reconnectAttempts: 0,
    lastMessageAt: timestamp,
    dataLatencyMs: 100,
    subscription: {
      boundingBoxes: [[[-90, -180], [90, 180]]],
      filtersShipMMSI: [],
      filterMessageTypes: ["PositionReport"]
    }
  };
}

function vesselEnvelope() {
  return {
    kind: "update",
    vessel: {
      ...vessel(),
      id: "mmsi-232001245",
      mmsi: "232001245",
      name: "CELTIC ROUTE"
    },
    metrics: { ...vesselMetrics(), liveVessels: 2, trackedVessels: 2 },
    sentAt: timestamp
  };
}

function aircraft() {
  return {
    id: "icao24-43c6f1",
    icao24: "43c6f1",
    callsign: "RFR7182",
    longitude: -1.1,
    latitude: 50.8,
    altitudeFt: 18000,
    groundSpeedKt: 310,
    trackDegrees: 138,
    emergency: false,
    onGround: false,
    classification: "military",
    riskLevel: "medium",
    source: "opensky",
    lastUpdated: timestamp,
    track: [{ longitude: -1.1, latitude: 50.8, altitudeFt: 18000, timestamp }]
  };
}

function aircraftMetrics() {
  return {
    liveAircraft: 1,
    trackedAircraft: 1,
    militaryAircraft: 1,
    emergencyAircraft: 0,
    averageAltitudeFt: 18000,
    averageGroundSpeedKt: 310,
    dataLatencyMs: 120,
    lastUpdated: timestamp
  };
}

function flightStatus() {
  return {
    mode: "live",
    provider: "opensky",
    state: "subscribed",
    connected: true,
    aircraftReceived: 10,
    aircraftNormalised: 9,
    aircraftDropped: 1,
    errors: 0,
    reconnectAttempts: 0,
    lastMessageAt: timestamp,
    dataLatencyMs: 100,
    subscription: {
      boundingBoxes: [[[-90, -180], [90, 180]]]
    }
  };
}

function aircraftEnvelope() {
  return {
    kind: "update",
    aircraft: {
      ...aircraft(),
      id: "icao24-40621b",
      icao24: "40621b",
      callsign: "BAW123",
      classification: "commercial",
      riskLevel: "low"
    },
    metrics: { ...aircraftMetrics(), liveAircraft: 2, trackedAircraft: 2 },
    sentAt: timestamp
  };
}

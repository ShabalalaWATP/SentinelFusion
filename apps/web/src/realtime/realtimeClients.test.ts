import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flightRealtimeClient } from "./flightRealtimeClient";
import { realtimeClient, type ConnectionStatus } from "./realtimeClient";

const timestamp = "2026-06-21T10:00:00.000Z";

type Listener = (event: { data?: string }) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly close = vi.fn();
  private readonly listeners: Record<string, Listener[]> = {};

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }

  emit(type: string, data?: unknown): void {
    for (const listener of this.listeners[type] ?? []) {
      listener({ data: typeof data === "string" ? data : JSON.stringify(data) });
    }
  }
}

describe("realtime clients", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports vessel connection state, validates messages, and closes cleanly", () => {
    const statuses: ConnectionStatus[] = [];
    const onMessage = vi.fn();
    const onError = vi.fn();

    const disconnect = realtimeClient.connect({
      onError,
      onMessage,
      onStatus: (status) => statuses.push(status)
    });
    const socket = FakeWebSocket.instances[0]!;

    socket.emit("open");
    socket.emit("message", vesselEnvelope());
    socket.emit("message", "{not-json");
    socket.emit("error");
    socket.emit("close");
    disconnect();

    expect(statuses).toEqual(["connecting", "open", "error", "closed"]);
    expect(onMessage).toHaveBeenCalledWith(vesselEnvelope());
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1]?.[0].message).toBe("Realtime connection failed");
    expect(socket.close).toHaveBeenCalledWith(1000, "dashboard unmounted");
  });

  it("reports aircraft connection state, validates messages, and closes cleanly", () => {
    const statuses: ConnectionStatus[] = [];
    const onMessage = vi.fn();
    const onError = vi.fn();

    const disconnect = flightRealtimeClient.connect({
      onError,
      onMessage,
      onStatus: (status) => statuses.push(status)
    });
    const socket = FakeWebSocket.instances[0]!;

    socket.emit("open");
    socket.emit("message", aircraftEnvelope());
    socket.emit("message", { kind: "unknown" });
    socket.emit("error");
    socket.emit("close");
    disconnect();

    expect(statuses).toEqual(["connecting", "open", "error", "closed"]);
    expect(onMessage).toHaveBeenCalledWith(aircraftEnvelope());
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1]?.[0].message).toBe("Flight realtime connection failed");
    expect(socket.close).toHaveBeenCalledWith(1000, "dashboard unmounted");
  });
});

function vesselEnvelope() {
  return {
    kind: "update",
    vessel: {
      id: "mmsi-232001234",
      mmsi: "232001234",
      name: "NORTHERN LIGHT",
      shipType: "Cargo",
      longitude: -1.1,
      latitude: 50.8,
      speedOverGround: 12.5,
      courseOverGround: 86,
      navigationalStatus: "Under way using engine",
      riskLevel: "low",
      lastUpdated: timestamp,
      track: [{ longitude: -1.1, latitude: 50.8, timestamp }]
    },
    metrics: {
      liveVessels: 1,
      trackedVessels: 1,
      highRiskVessels: 0,
      averageSpeed: 12.5,
      dataLatencyMs: 100,
      lastUpdated: timestamp
    },
    sentAt: timestamp
  };
}

function aircraftEnvelope() {
  return {
    kind: "update",
    aircraft: {
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
    },
    metrics: {
      liveAircraft: 1,
      trackedAircraft: 1,
      militaryAircraft: 1,
      emergencyAircraft: 0,
      averageAltitudeFt: 18000,
      averageGroundSpeedKt: 310,
      dataLatencyMs: 120,
      lastUpdated: timestamp
    },
    sentAt: timestamp
  };
}

import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config/environment";
import { RealtimeBroadcaster } from "../src/realtime/realtime-broadcaster";
import { AisStreamStatusTracker } from "../src/ais/ais-stream-status-tracker";
import { FlightStreamStatusTracker } from "../src/flights/flight-stream-status-tracker";
import { isAllowedOrigin } from "../src/ws/origin";

const config: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  trustProxy: false,
  corsOrigins: ["http://localhost:5173"],
  aisMode: "mock",
  mockStreamIntervalMs: 1000,
  aisstreamUrl: "wss://stream.aisstream.io/v0/stream",
  aisstreamBoundingBoxes: [[[-90, -180], [90, 180]]],
  aisstreamFilterMMSI: [],
  aisstreamFilterMessageTypes: ["PositionReport"],
  aisstreamReconnectBaseMs: 1000,
  aisstreamReconnectMaxMs: 30000,
  aisstreamHeartbeatMs: 30000,
  flightMode: "live",
  flightProvider: "opensky",
  flightBoundingBoxes: [[[-90, -180], [90, 180]]],
  flightPollIntervalMs: 5000,
  flightStaleAfterSeconds: 60,
  flightProviderTimeoutMs: 10000,
  flightApiBaseUrl: "https://opensky-network.org/api",
  marineWeatherMode: "mock",
  marineWeatherTimeoutMs: 10000,
  marineWeatherCacheSeconds: 900,
  marineWeatherCacheMaxEntries: 200,
  firmsMode: "mock",
  firmsSource: "VIIRS_SNPP_NRT",
  firmsDayRange: 1,
  firmsTimeoutMs: 10000,
  firmsCacheSeconds: 900,
  firmsCacheMaxEntries: 200,
  firmsMaxDetections: 150,
  airportContextMode: "mock",
  airportContextTimeoutMs: 10000,
  airportContextCacheSeconds: 86400,
  airportContextMaxResults: 8,
  airportContextMaxRunwaysPerAirport: 4,
  satelliteContextMode: "live",
  satelliteContextProvider: "nasa-gibs",
  satelliteContextLayer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
  satelliteContextDateOffsetDays: 1,
  satelliteContextImageSize: 512,
  analysisMode: "mock",
  openaiModel: "gpt-5.4-mini",
  openaiTimeoutMs: 20000,
  rateLimitMax: 100,
  rateLimitWindow: "1 minute",
  logLevel: "error"
};

class FakeSocket {
  readonly send = vi.fn();
  private readonly handlers = new Map<string, Array<() => void>>();

  constructor(public readyState = 1) {}

  on(event: string, handler: () => void): void {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
  }

  emit(event: string): void {
    this.handlers.get(event)?.forEach((handler) => handler());
  }
}

describe("flight stream status tracker", () => {
  it("records lifecycle counters, latency, endpoint metadata, and redacted-length errors", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T10:00:10.000Z"));
    const tracker = new FlightStreamStatusTracker(config);

    tracker.record({ type: "state", state: "subscribed", connected: true });
    tracker.record({ type: "message", sourceTimestamp: "2026-06-11T10:00:00.000Z" });
    tracker.record({ type: "normalised" });
    tracker.recordAircraft(3);
    tracker.record({ type: "dropped", reason: "d".repeat(260) });
    tracker.record({ type: "error", message: "e".repeat(260) });
    tracker.record({ type: "reconnect", attempt: 4 });

    expect(tracker.snapshot()).toMatchObject({
      mode: "live",
      provider: "opensky",
      state: "subscribed",
      connected: true,
      aircraftReceived: 1,
      aircraftNormalised: 4,
      aircraftDropped: 1,
      errors: 1,
      reconnectAttempts: 4,
      dataLatencyMs: 10000,
      subscription: {
        boundingBoxes: config.flightBoundingBoxes,
        endpoint: "https://opensky-network.org/api"
      }
    });
    expect(tracker.snapshot().lastError).toHaveLength(240);
    vi.useRealTimers();
  });

  it("uses zero latency for invalid source timestamps", () => {
    const tracker = new FlightStreamStatusTracker(config);

    tracker.record({ type: "message", sourceTimestamp: "not-a-date" });

    expect(tracker.snapshot()).toMatchObject({
      aircraftReceived: 1,
      dataLatencyMs: 0
    });
  });
});

describe("AIS stream status tracker", () => {
  it("records lifecycle events, live endpoint metadata, latency, and clears stale errors after recovery", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T10:00:10.000Z"));
    const tracker = new AisStreamStatusTracker({
      ...config,
      aisMode: "live",
      aisstreamUrl: "wss://stream.aisstream.io/v0/stream"
    });

    tracker.record({ type: "state", state: "connecting", connected: false });
    tracker.record({ type: "error", message: "e".repeat(260) });
    tracker.record({ type: "state", state: "subscribed", connected: true });
    tracker.recordMessage({
      mmsi: "232001234",
      timestamp: "2026-06-11T10:00:00.000Z",
      latitude: 50.8,
      longitude: -1.1,
      speedOverGround: 12,
      courseOverGround: 90,
      heading: 90,
      shipType: "Cargo",
      navigationalStatus: "Under way using engine"
    });
    tracker.record({ type: "normalised" });
    tracker.record({ type: "dropped", reason: "bad frame" });
    tracker.record({ type: "reconnect", attempt: 2 });

    expect(tracker.snapshot()).toMatchObject({
      mode: "live",
      state: "subscribed",
      connected: true,
      messagesReceived: 1,
      messagesNormalised: 1,
      messagesDropped: 1,
      errors: 1,
      reconnectAttempts: 2,
      dataLatencyMs: 10000,
      subscription: {
        endpoint: "wss://stream.aisstream.io/v0/stream",
        boundingBoxes: config.aisstreamBoundingBoxes,
        filterMessageTypes: ["PositionReport"]
      }
    });
    expect(tracker.snapshot().lastError).toHaveLength(240);
    vi.useRealTimers();
  });

  it("uses zero latency for AIS messages with invalid timestamps", () => {
    const tracker = new AisStreamStatusTracker(config);

    tracker.record({ type: "message", sourceTimestamp: "not-a-date" });

    expect(tracker.snapshot()).toMatchObject({
      messagesReceived: 1,
      dataLatencyMs: 0
    });
  });
});

describe("realtime broadcaster", () => {
  it("broadcasts only to open sockets and removes failed clients", () => {
    const broadcaster = new RealtimeBroadcaster();
    const openClient = new FakeSocket(1);
    const closedClient = new FakeSocket(3);

    broadcaster.addClient(openClient as never);
    broadcaster.addClient(closedClient as never);
    broadcaster.broadcast({ kind: "snapshot", vessels: [], metrics: {}, sentAt: "now" } as never);

    expect(openClient.send).toHaveBeenCalledTimes(1);
    expect(closedClient.send).not.toHaveBeenCalled();
    expect(broadcaster.clientCount()).toBe(2);

    openClient.emit("error");
    closedClient.emit("close");
    expect(broadcaster.clientCount()).toBe(0);
  });
});

describe("websocket origin guard", () => {
  it("requires an explicit allowed browser origin", () => {
    expect(isAllowedOrigin("http://localhost:5173", ["http://localhost:5173"])).toBe(true);
    expect(isAllowedOrigin("https://evil.example", ["http://localhost:5173"])).toBe(false);
    expect(isAllowedOrigin(undefined, ["http://localhost:5173"])).toBe(false);
  });
});

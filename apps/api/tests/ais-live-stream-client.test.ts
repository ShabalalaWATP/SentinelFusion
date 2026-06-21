import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { AppConfig } from "../src/config/environment";
import { AisStreamLiveClient } from "../src/ais/ais-stream-live-client";

type Handler = (...args: unknown[]) => void;

const wsMock = vi.hoisted(() => {
  class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    static readonly instances: MockWebSocket[] = [];

    readonly handlers = new Map<string, Handler[]>();
    readonly send = vi.fn();
    readonly ping = vi.fn();
    readonly terminate = vi.fn(() => {
      this.readyState = MockWebSocket.CLOSED;
    });

    readyState = MockWebSocket.CONNECTING;

    constructor(readonly url: string) {
      MockWebSocket.instances.push(this);
    }

    on(event: string, handler: Handler): this {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      this.handlers.get(event)?.forEach((handler) => handler(...args));
    }

    open(): void {
      this.readyState = MockWebSocket.OPEN;
      this.emit("open");
    }

    message(payload: unknown): void {
      this.emit("message", typeof payload === "string" ? payload : JSON.stringify(payload));
    }

    close = vi.fn(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.emit("close");
    });
  }

  return { MockWebSocket };
});

vi.mock("ws", () => ({ default: wsMock.MockWebSocket }));

const baseConfig: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  trustProxy: false,
  corsOrigins: ["http://localhost:5173"],
  aisMode: "live",
  mockStreamIntervalMs: 1000,
  aisstreamUrl: "wss://stream.aisstream.io/v0/stream",
  aisstreamBoundingBoxes: [[[-90, -180], [90, 180]]],
  aisstreamFilterMMSI: ["232001234"],
  aisstreamFilterMessageTypes: ["PositionReport", "ShipStaticData"],
  aisstreamReconnectBaseMs: 1000,
  aisstreamReconnectMaxMs: 3000,
  aisstreamHeartbeatMs: 5000,
  flightMode: "mock",
  flightProvider: "mock",
  flightBoundingBoxes: [[[-90, -180], [90, 180]]],
  flightPollIntervalMs: 5000,
  flightStaleAfterSeconds: 60,
  flightProviderTimeoutMs: 10000,
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
  logLevel: "error",
  aisstreamApiKey: "test-aisstream-key"
};

function positionReportFrame() {
  return {
    MessageType: "PositionReport",
    MetaData: {
      MMSI: 232001234,
      ShipName: "NORTHERN LIGHT",
      latitude: 51.95,
      longitude: 1.3,
      time_utc: "2026-06-11 10:00:00.000000 +0000 UTC"
    },
    Message: {
      PositionReport: {
        UserID: 232001234,
        Latitude: 51.95,
        Longitude: 1.3,
        Sog: 13.2,
        Cog: 76,
        TrueHeading: 74,
        NavigationalStatus: 0
      }
    }
  };
}

describe("AISstream live client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsMock.MockWebSocket.instances.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects live subscriptions without a server-side API key", () => {
    const events: unknown[] = [];
    const client = new AisStreamLiveClient({ ...baseConfig, aisstreamApiKey: undefined });

    client.subscribe(vi.fn(), (event) => events.push(event));

    expect(wsMock.MockWebSocket.instances).toHaveLength(0);
    expect(events).toEqual([
      { type: "error", message: "AISSTREAM_API_KEY is required for live mode." },
      { type: "state", state: "error", connected: false }
    ]);
  });

  it("subscribes with bounded filters and emits normalised AIS messages", () => {
    const messages: unknown[] = [];
    const events: unknown[] = [];
    const client = new AisStreamLiveClient(baseConfig);

    const stop = client.subscribe((message) => messages.push(message), (event) => events.push(event));
    const socket = wsMock.MockWebSocket.instances[0]!;
    socket.open();
    socket.message(positionReportFrame());

    expect(socket.url).toBe(baseConfig.aisstreamUrl);
    expect(JSON.parse(String(socket.send.mock.calls[0]?.[0]))).toEqual({
      APIKey: "test-aisstream-key",
      BoundingBoxes: baseConfig.aisstreamBoundingBoxes,
      FiltersShipMMSI: ["232001234"],
      FilterMessageTypes: ["PositionReport", "ShipStaticData"]
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      mmsi: "232001234",
      name: "NORTHERN LIGHT",
      longitude: 1.3,
      latitude: 51.95
    });
    expect(events).toContainEqual({ type: "state", state: "connecting", connected: false });
    expect(events).toContainEqual({ type: "state", state: "subscribed", connected: true });

    stop();
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual({ type: "state", state: "closed", connected: false });
  });

  it("reports malformed, dropped, and non-credential error frames without stopping the stream", () => {
    const events: unknown[] = [];
    const client = new AisStreamLiveClient(baseConfig);
    client.subscribe(vi.fn(), (event) => events.push(event));
    const socket = wsMock.MockWebSocket.instances[0]!;
    socket.open();

    socket.message("{not-json");
    socket.message({ MessageType: "PositionReport", Message: { PositionReport: {} } });
    socket.message({ error: "temporary upstream fault" });

    expect(events).toContainEqual({
      type: "dropped",
      reason: "AISstream frame was not valid JSON."
    });
    expect(events).toContainEqual({
      type: "dropped",
      reason: "AISstream PositionReport frame lacked usable MMSI or position."
    });
    expect(events).toContainEqual({ type: "error", message: "temporary upstream fault" });
    expect(socket.close).not.toHaveBeenCalled();
  });

  it("stops reconnecting when AISstream rejects credentials", () => {
    const events: unknown[] = [];
    const client = new AisStreamLiveClient(baseConfig);
    client.subscribe(vi.fn(), (event) => events.push(event));
    const socket = wsMock.MockWebSocket.instances[0]!;
    socket.open();

    socket.message({ error: "Api Key Is Not Valid" });
    socket.emit("close");
    vi.advanceTimersByTime(baseConfig.aisstreamReconnectBaseMs);

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual({ type: "error", message: "Api Key Is Not Valid" });
    expect(events).toContainEqual({ type: "state", state: "error", connected: false });
    expect(events).not.toContainEqual({ type: "state", state: "reconnecting", connected: false });
    expect(wsMock.MockWebSocket.instances).toHaveLength(1);
  });

  it("backs off and reopens the socket after non-terminal close events", () => {
    const events: unknown[] = [];
    const client = new AisStreamLiveClient(baseConfig);
    client.subscribe(vi.fn(), (event) => events.push(event));
    const firstSocket = wsMock.MockWebSocket.instances[0]!;
    firstSocket.open();

    firstSocket.emit("close");
    expect(events).toContainEqual({ type: "state", state: "reconnecting", connected: false });
    expect(events).toContainEqual({ type: "reconnect", attempt: 1 });
    expect(wsMock.MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(baseConfig.aisstreamReconnectBaseMs);
    expect(wsMock.MockWebSocket.instances).toHaveLength(2);

    const secondSocket = wsMock.MockWebSocket.instances[1]!;
    secondSocket.open();
    expect(secondSocket.send).toHaveBeenCalledTimes(1);
  });

  it("pings active sockets and terminates them when heartbeats fail", () => {
    const events: unknown[] = [];
    const client = new AisStreamLiveClient(baseConfig);
    client.subscribe(vi.fn(), (event) => events.push(event));
    const socket = wsMock.MockWebSocket.instances[0]!;
    socket.open();

    vi.advanceTimersByTime(baseConfig.aisstreamHeartbeatMs);
    expect(socket.ping).toHaveBeenCalledTimes(1);

    socket.ping.mockImplementationOnce(() => {
      throw new Error("ping failed");
    });
    vi.advanceTimersByTime(baseConfig.aisstreamHeartbeatMs);

    expect(events).toContainEqual({ type: "error", message: "ping failed" });
    expect(socket.terminate).toHaveBeenCalledTimes(1);
  });
});

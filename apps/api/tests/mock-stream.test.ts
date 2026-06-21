import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config/environment";
import { AisMessageNormaliser } from "../src/ais/ais-message-normaliser";
import { AisReplayStreamClient } from "../src/ais/ais-replay-stream-client";
import { MockAisStreamClient } from "../src/ais/mock-ais-stream-client";

describe("mock AIS stream", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits valid synthetic AIS messages", async () => {
    const client = new MockAisStreamClient(1000);
    const normaliser = new AisMessageNormaliser();
    const messages = new Set<string>();

    const stop = client.subscribe((message) => {
      messages.add(normaliser.normalise(message).mmsi);
    });
    stop();

    expect(messages.size).toBeGreaterThan(5);
  });

  it("advances a single mock vessel on each timer tick and emits closed state on unsubscribe", () => {
    vi.useFakeTimers();
    const client = new MockAisStreamClient(1000);
    const events: unknown[] = [];
    const positions: Array<{ longitude: number; latitude: number; speedOverGround: number }> = [];

    const stop = client.subscribe(
      (message) => {
        if (message.mmsi === "232001234") {
          positions.push({
            longitude: message.longitude,
            latitude: message.latitude,
            speedOverGround: message.speedOverGround
          });
        }
      },
      (event) => events.push(event)
    );

    vi.advanceTimersByTime(1000);
    stop();
    vi.advanceTimersByTime(3000);

    expect(positions).toHaveLength(2);
    expect(positions[1]?.longitude).not.toBe(positions[0]?.longitude);
    expect(positions[1]?.latitude).not.toBe(positions[0]?.latitude);
    expect(events).toEqual([
      { type: "state", state: "subscribed", connected: true },
      { type: "state", state: "closed", connected: false }
    ]);
  });
});

describe("AIS replay stream", () => {
  it("drops invalid replay lines and AISstream error frames while replaying valid messages", () => {
    const replayFile = join(mkdtempSync(join(tmpdir(), "ais-replay-")), "replay.jsonl");
    writeFileSync(
      replayFile,
      [
        "{not-json",
        JSON.stringify({ error: "Api Key Is Not Valid" }),
        JSON.stringify({
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
        })
      ].join("\n")
    );
    const events: unknown[] = [];
    const messages: string[] = [];
    const client = new AisReplayStreamClient({ ...baseConfig(), aisReplayFile: replayFile });

    const stop = client.subscribe((message) => messages.push(message.mmsi), (event) => events.push(event));
    stop();

    expect(messages).toEqual(["232001234"]);
    expect(events).toContainEqual({
      type: "dropped",
      reason: "Replay fixture line was not valid JSON."
    });
    expect(events).toContainEqual({ type: "error", message: "Api Key Is Not Valid" });
    expect(events).toContainEqual({ type: "state", state: "subscribed", connected: true });
    expect(events).toContainEqual({ type: "state", state: "closed", connected: false });
  });

  it("returns an error state when the replay fixture cannot be read or contains no usable messages", () => {
    const events: unknown[] = [];
    const missingClient = new AisReplayStreamClient({
      ...baseConfig(),
      aisReplayFile: join(tmpdir(), "missing-ais-replay-file.jsonl")
    });

    const stop = missingClient.subscribe(vi.fn(), (event) => events.push(event));
    stop();

    expect(events[0]).toMatchObject({ type: "error" });
    expect(events).toContainEqual({ type: "state", state: "error", connected: false });
    expect(events).toContainEqual({ type: "state", state: "closed", connected: false });
  });
});

function baseConfig(): AppConfig {
  return {
    nodeEnv: "test",
    host: "127.0.0.1",
    port: 0,
    trustProxy: false,
    corsOrigins: ["http://localhost:5173"],
    aisMode: "replay",
    mockStreamIntervalMs: 1000,
    aisstreamUrl: "wss://stream.aisstream.io/v0/stream",
    aisstreamBoundingBoxes: [[[-90, -180], [90, 180]]],
    aisstreamFilterMMSI: [],
    aisstreamFilterMessageTypes: ["PositionReport"],
    aisstreamReconnectBaseMs: 1000,
    aisstreamReconnectMaxMs: 30000,
    aisstreamHeartbeatMs: 30000,
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
    logLevel: "error"
  };
}

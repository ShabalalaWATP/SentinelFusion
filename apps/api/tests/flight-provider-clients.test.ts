import type { Aircraft } from "@aisstream/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config/environment";
import type { IFlightTrackingClient } from "../src/domain/interfaces";
import { AdsbExchangeFlightTrackingClient } from "../src/flights/adsb-exchange-flight-client";
import { OpenSkyFlightTrackingClient } from "../src/flights/open-sky-flight-client";

describe("flight provider clients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalises OpenSky state vectors into aircraft", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          time: 1760000000,
          states: [
            [
              "43c6f1",
              "RFR7182 ",
              "United Kingdom",
              1760000000,
              1760000000,
              -1.75,
              51.2,
              5486.4,
              false,
              159.5,
              138,
              1.5,
              null,
              5600,
              "7001",
              false,
              0,
              3
            ],
            [
              "43c6f2",
              "FAST1 ",
              "United Kingdom",
              1760000000,
              1760000000,
              -1.7,
              51.1,
              5486.4,
              false,
              700,
              138,
              1.5,
              null,
              5600,
              null,
              false,
              0,
              3
            ]
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new OpenSkyFlightTrackingClient(baseConfig({ provider: "opensky" }));
    const aircraft = await firstAircraftBatch(client);

    expect(aircraft).toHaveLength(2);
    expect(aircraft[0]).toMatchObject({
      id: "icao24-43c6f1",
      callsign: "RFR7182",
      altitudeFt: 18000,
      groundSpeedKt: 310,
      source: "opensky"
    });
    expect(aircraft[1]?.groundSpeedKt).toBeUndefined();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/states/all");
  });

  it("uses OpenSky OAuth client credentials when configured", async () => {
    const fetchMock = vi.fn(async (input: URL | string) => {
      if (String(input).includes("auth.opensky-network.org")) {
        return new Response(
          JSON.stringify({
            access_token: "test-opensky-token",
            expires_in: 1800
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          time: 1760000000,
          states: [["43c6f1", "RFR7182 ", "United Kingdom", 1760000000, 1760000000, -1.75, 51.2]]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OpenSkyFlightTrackingClient(
      baseConfig({
        openSkyClientId: "client-id",
        openSkyClientSecret: "client-secret",
        provider: "opensky"
      })
    );
    const aircraft = await firstAircraftBatch(client);
    const stateCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/states/all")
    );
    const headers = stateCall?.[1]?.headers as Headers | undefined;

    expect(aircraft).toHaveLength(1);
    expect(headers?.get("authorization")).toBe("Bearer test-opensky-token");
  });

  it("surfaces OpenSky retry-after guidance when rate limited", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("", {
        status: 429,
        headers: {
          "x-rate-limit-retry-after-seconds": "120"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new OpenSkyFlightTrackingClient(baseConfig({ provider: "opensky" }));
    const message = await firstErrorMessage(client);

    expect(message).toBe("OpenSky rate limit exhausted; retrying after 120 seconds.");
  });

  it("uses ADS-B Exchange api-auth header and normalises v2 aircraft", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          now: 1760000000000,
          ac: [
            {
              hex: "4d2222",
              flight: "MEDIC7 ",
              r: "G-MEDC",
              t: "EC45",
              lat: 51.05,
              lon: -2.1,
              alt_baro: 2200,
              alt_geom: 2300,
              gs: 1400,
              track: 42,
              baro_rate: -400,
              squawk: "7700",
              emergency: "general",
              category: "A7"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new AdsbExchangeFlightTrackingClient(
      baseConfig({ apiKey: "test-flight-key", provider: "adsbexchange" })
    );
    const aircraft = await firstAircraftBatch(client);

    expect(aircraft[0]).toMatchObject({
      id: "icao24-4d2222",
      callsign: "MEDIC7",
      emergency: true,
      riskLevel: "high",
      source: "adsbexchange"
    });
    expect(aircraft[0]?.groundSpeedKt).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "api-auth": "test-flight-key"
    });
  });
});

function firstAircraftBatch(client: IFlightTrackingClient): Promise<Aircraft[]> {
  let unsubscribe = (): void => undefined;

  return new Promise((resolve, reject) => {
    unsubscribe = client.subscribe(
      (aircraft) => {
        unsubscribe();
        resolve(aircraft);
      },
      (event) => {
        if (event.type === "error") {
          unsubscribe();
          reject(new Error(event.message));
        }
      }
    );
  });
}

function firstErrorMessage(client: IFlightTrackingClient): Promise<string> {
  let unsubscribe = (): void => undefined;

  return new Promise((resolve) => {
    unsubscribe = client.subscribe(
      () => undefined,
      (event) => {
        if (event.type === "error") {
          unsubscribe();
          resolve(event.message);
        }
      }
    );
  });
}

function baseConfig({
  apiKey,
  openSkyClientId,
  openSkyClientSecret,
  provider
}: {
  apiKey?: string;
  openSkyClientId?: string;
  openSkyClientSecret?: string;
  provider: AppConfig["flightProvider"];
}): AppConfig {
  return {
    nodeEnv: "test",
    host: "127.0.0.1",
    port: 4000,
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
    flightProvider: provider,
    ...(apiKey ? { flightApiKey: apiKey } : {}),
    ...(openSkyClientId ? { openSkyClientId } : {}),
    ...(openSkyClientSecret ? { openSkyClientSecret } : {}),
    flightBoundingBoxes: [[[50, -3], [52, 0]]],
    flightPollIntervalMs: 60000,
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
  airspaceContextMode: "off",
  airspaceContextMaxResults: 25,
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 120,
    rateLimitWindow: "1 minute",
    logLevel: "fatal"
  };
}

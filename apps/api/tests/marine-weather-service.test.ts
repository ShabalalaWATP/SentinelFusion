import { describe, expect, it, vi } from "vitest";
import { MarineWeatherService } from "../src/context/marine-weather-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-20T12:00:00.000Z";
const generatedAtSeconds = Date.parse(generatedAt) / 1000;
const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

describe("marine weather service", () => {
  it("normalises live Open-Meteo marine conditions and caches rounded points", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          latitude: 50.791664,
          longitude: -1.0416565,
          current: {
            time: generatedAtSeconds,
            wave_height: 1.2,
            wave_direction: 245,
            wave_period: 4.8,
            wind_wave_height: 0.8,
            swell_wave_height: 0.9,
            swell_wave_direction: 260,
            swell_wave_period: 6.1,
            sea_surface_temperature: 14.6,
            ocean_current_velocity: 0.5,
            ocean_current_direction: 90
          },
          hourly: {
            time: [generatedAtSeconds, generatedAtSeconds + 3600],
            wave_height: [1.2, 1.3],
            wave_period: [4.8, 4.9],
            wind_wave_height: [0.8, 0.9],
            swell_wave_height: [0.9, 1]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = new MarineWeatherService(
      config({ marineWeatherMode: "live" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const first = await service.getAreaWeather(bounds);
    const second = await service.getAreaWeather(bounds);
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(first).toMatchObject({
      status: "ok",
      mode: "live",
      cached: false,
      current: {
        waveHeightM: 1.2,
        seaSurfaceTemperatureC: 14.6
      },
      risk: {
        level: "low"
      }
    });
    expect(first.forecast).toHaveLength(2);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl.hostname).toBe("marine-api.open-meteo.com");
    expect(calledUrl.searchParams.get("latitude")).toBe("50.79000");
    expect(JSON.stringify(first)).not.toContain("APIKey");
  });

  it("does not reuse cached area metadata for different bounds sharing a centre", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          latitude: 50.79,
          longitude: -1.04,
          current: {
            time: generatedAtSeconds,
            wave_height: 1.2
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = new MarineWeatherService(
      config({ marineWeatherMode: "live" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );
    const alternateBounds = { south: 50.7, west: -1.3, north: 50.88, east: -0.84 };

    const first = await service.getAreaWeather(bounds);
    const second = await service.getAreaWeather(alternateBounds);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.area).toEqual(bounds);
    expect(second.area).toEqual(alternateBounds);
  });

  it("returns a not-configured state when marine weather is off", async () => {
    const fetchMock = vi.fn();
    const service = new MarineWeatherService(
      config({ marineWeatherMode: "off" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaWeather(bounds);

    expect(result.status).toBe("not_configured");
    expect(result.limitations[0]).toContain("MARINE_WEATHER_MODE=live");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a typed provider error when Open-Meteo fails", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 503 }));
    const service = new MarineWeatherService(
      config({ marineWeatherMode: "live" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaWeather(bounds);

    expect(result).toMatchObject({
      status: "error",
      mode: "live",
      error: "Open-Meteo returned HTTP 503."
    });
  });

  it("normalises antimeridian centres and honours disabled response caching", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          latitude: 10,
          longitude: -179.5,
          current: {
            time: generatedAtSeconds,
            wave_height: 0.4
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = new MarineWeatherService(
      config({
        marineWeatherMode: "live",
        marineWeatherCacheSeconds: 0
      }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );
    const antimeridianBounds = { south: 9, west: 179, north: 11, east: -178 };

    const first = await service.getAreaWeather(antimeridianBounds);
    const second = await service.getAreaWeather(antimeridianBounds);
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(first.status).toBe("ok");
    expect(second.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calledUrl.searchParams.get("longitude")).toBe("-179.50000");
  });

  it("evicts the oldest marine weather cache entry at the configured cache limit", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          latitude: 50.79,
          longitude: -1.04,
          current: {
            time: generatedAtSeconds,
            wave_height: 0.4
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = new MarineWeatherService(
      config({
        marineWeatherMode: "live",
        marineWeatherCacheMaxEntries: 1
      }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );
    const alternateBounds = { south: 40, west: 10, north: 41, east: 11 };

    await service.getAreaWeather(bounds);
    await service.getAreaWeather(alternateBounds);
    await service.getAreaWeather(bounds);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("wraps non-Error Open-Meteo failures in a safe provider error", async () => {
    const fetchMock = vi.fn(async () => Promise.reject("socket closed"));
    const service = new MarineWeatherService(
      config({ marineWeatherMode: "live" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaWeather(bounds);

    expect(result.status).toBe("error");
    expect(result.error).toBe("Open-Meteo request failed.");
  });
});

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
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
    flightMode: "mock",
    flightProvider: "mock",
    flightBoundingBoxes: [[[-90, -180], [90, 180]]],
    flightPollIntervalMs: 5000,
    flightStaleAfterSeconds: 60,
    flightProviderTimeoutMs: 10000,
    marineWeatherMode: "live",
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
    ...overrides
  };
}

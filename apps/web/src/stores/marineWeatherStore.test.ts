import { describe, expect, it } from "vitest";
import type { MarineWeatherResponse } from "@aisstream/shared";
import { useMarineWeatherStore } from "./marineWeatherStore";

const timestamp = "2026-06-20T12:00:00.000Z";
const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

const weather: MarineWeatherResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "Open-Meteo Marine Weather",
    url: "https://open-meteo.com/en/docs/marine-weather-api",
    attribution: "Weather data by Open-Meteo"
  },
  generatedAt: timestamp,
  cached: false,
  area: bounds,
  location: { latitude: 50.79, longitude: -1.04 },
  current: {
    time: timestamp,
    waveHeightM: 0.8
  },
  forecast: [],
  risk: {
    level: "low",
    reasons: ["Current sea state is below configured concern thresholds."]
  },
  limitations: ["Marine conditions are modelled."]
};

describe("marineWeatherStore", () => {
  it("loads marine weather context", async () => {
    useMarineWeatherStore.getState().reset();

    await useMarineWeatherStore.getState().refresh(bounds, {
      getMarineWeather: async () => weather
    });

    expect(useMarineWeatherStore.getState()).toMatchObject({
      status: "success",
      error: null,
      result: {
        status: "ok",
        current: {
          waveHeightM: 0.8
        }
      }
    });
  });

  it("preserves provider not-configured responses as results", async () => {
    useMarineWeatherStore.getState().reset();
    const notConfigured: MarineWeatherResponse = {
      status: "not_configured",
      mode: weather.mode,
      source: weather.source,
      generatedAt: weather.generatedAt,
      cached: weather.cached,
      area: weather.area,
      location: weather.location,
      forecast: weather.forecast,
      risk: weather.risk,
      limitations: ["Enable MARINE_WEATHER_MODE=live."]
    };

    await useMarineWeatherStore.getState().refresh(bounds, {
      getMarineWeather: async () => notConfigured
    });

    expect(useMarineWeatherStore.getState().status).toBe("success");
    expect(useMarineWeatherStore.getState().result?.status).toBe("not_configured");
  });

  it("stores transport errors separately from provider states", async () => {
    useMarineWeatherStore.getState().reset();

    await useMarineWeatherStore.getState().refresh(bounds, {
      getMarineWeather: async () => {
        throw new Error("request failed");
      }
    });

    expect(useMarineWeatherStore.getState()).toMatchObject({
      status: "error",
      error: "request failed"
    });
  });

  it("ignores older refresh responses after a newer area request starts", async () => {
    useMarineWeatherStore.getState().reset();
    const first = deferred<MarineWeatherResponse>();
    const second = deferred<MarineWeatherResponse>();
    const alternateBounds = { south: 50.7, west: -1.3, north: 50.88, east: -0.84 };
    const alternateWeather: MarineWeatherResponse = {
      ...weather,
      area: alternateBounds,
      current: {
        time: timestamp,
        waveHeightM: 2.4
      }
    };

    const firstRequest = useMarineWeatherStore.getState().refresh(bounds, {
      getMarineWeather: async () => first.promise
    });
    const secondRequest = useMarineWeatherStore.getState().refresh(alternateBounds, {
      getMarineWeather: async () => second.promise
    });

    second.resolve(alternateWeather);
    await secondRequest;
    expect(useMarineWeatherStore.getState().result?.area).toEqual(alternateBounds);

    first.resolve(weather);
    await firstRequest;
    expect(useMarineWeatherStore.getState().result?.area).toEqual(alternateBounds);
    expect(useMarineWeatherStore.getState().result?.current?.waveHeightM).toBe(2.4);
  });
});

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

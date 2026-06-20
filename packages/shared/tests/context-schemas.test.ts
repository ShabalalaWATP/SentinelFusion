import { describe, expect, it } from "vitest";
import { marineWeatherResponseSchema } from "../src";

const now = new Date("2026-06-20T12:00:00.000Z").toISOString();

describe("context schemas", () => {
  it("validates marine weather context responses", () => {
    const parsed = marineWeatherResponseSchema.parse({
      status: "ok",
      mode: "live",
      source: {
        title: "Open-Meteo Marine Weather",
        url: "https://open-meteo.com/en/docs/marine-weather-api",
        attribution: "Weather data by Open-Meteo"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      location: { latitude: 50.79, longitude: -1.04, label: "Selected area centre" },
      current: {
        time: now,
        waveHeightM: 0.9,
        waveDirectionDeg: 240,
        wavePeriodSeconds: 4.8,
        seaSurfaceTemperatureC: 14.2,
        oceanCurrentVelocityKt: 0.3
      },
      forecast: [
        {
          time: now,
          waveHeightM: 1.1,
          wavePeriodSeconds: 5.1
        }
      ],
      risk: {
        level: "low",
        reasons: ["Current sea state is below configured concern thresholds."]
      },
      limitations: ["Marine weather is modelled at the nearest sea grid point."]
    });

    expect(parsed.current?.waveHeightM).toBe(0.9);
    expect(parsed.forecast).toHaveLength(1);
  });

  it("rejects active URL schemes in marine weather source metadata", () => {
    expect(() =>
      marineWeatherResponseSchema.parse({
        status: "ok",
        mode: "live",
        source: {
          title: "Unsafe provider",
          url: "javascript:alert(1)",
          attribution: "Unsafe"
        },
        generatedAt: now,
        cached: false,
        location: { latitude: 50.79, longitude: -1.04 },
        risk: {
          level: "low",
          reasons: ["No concern threshold was crossed."]
        },
        limitations: ["Test limitation."]
      })
    ).toThrow();
  });
});

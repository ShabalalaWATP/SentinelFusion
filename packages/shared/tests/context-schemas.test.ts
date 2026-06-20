import { describe, expect, it } from "vitest";
import { fireContextResponseSchema, marineWeatherResponseSchema } from "../src";

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

  it("validates fire context responses", () => {
    const parsed = fireContextResponseSchema.parse({
      status: "ok",
      mode: "live",
      source: {
        title: "NASA FIRMS Active Fire",
        url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
        attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      sourceDataset: "VIIRS_SNPP_NRT",
      dayRange: 1,
      detections: [
        {
          id: "VIIRS_SNPP_NRT:50.79000:-1.04000:2026-06-21T09:30:00.000Z:18.60",
          latitude: 50.79,
          longitude: -1.04,
          acquiredAt: "2026-06-21T09:30:00.000Z",
          confidence: "high",
          rawConfidence: "h",
          satellite: "N",
          instrument: "VIIRS",
          version: "2.0NRT",
          dayNight: "day",
          brightnessKelvin: 331.4,
          fireRadiativePowerMw: 18.6
        }
      ],
      summary: {
        count: 1,
        highConfidenceCount: 1,
        dayCount: 1,
        nightCount: 0,
        maxFireRadiativePowerMw: 18.6,
        latestAcquiredAt: "2026-06-21T09:30:00.000Z"
      },
      risk: {
        level: "medium",
        reasons: ["One active fire detection may affect area operations."]
      },
      limitations: [
        "FIRMS active-fire points are satellite thermal detections and can include false positives or missed fires."
      ]
    });

    expect(parsed.detections[0]?.confidence).toBe("high");
    expect(parsed.summary.maxFireRadiativePowerMw).toBe(18.6);
  });
});

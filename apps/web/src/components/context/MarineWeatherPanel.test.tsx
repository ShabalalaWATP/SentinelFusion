import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisAreaResult, MarineWeatherResponse } from "@aisstream/shared";
import { useMarineWeatherStore } from "../../stores/marineWeatherStore";
import { MarineWeatherPanel } from "./MarineWeatherPanel";

const timestamp = "2026-06-20T12:00:00.000Z";
const area: AnalysisAreaResult = {
  id: "portsmouth",
  name: "Portsmouth",
  bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
  count: 0,
  listedCount: 0,
  highRiskCount: 0,
  militaryCount: 0,
  averageSpeedKn: 0,
  aircraftCount: 0,
  listedAircraftCount: 0,
  militaryAircraftCount: 0,
  emergencyAircraftCount: 0,
  averageAircraftAltitudeFt: 0,
  averageAircraftSpeedKt: 0,
  vessels: [],
  aircraft: []
};

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
  area: area.bounds,
  location: { latitude: 50.79, longitude: -1.04, label: "Nearest sea grid point" },
  current: {
    time: timestamp,
    waveHeightM: 0.8,
    wavePeriodSeconds: 4.5,
    swellWaveHeightM: 0.6,
    oceanCurrentVelocityKt: 0.4,
    waveDirectionDeg: 240,
    seaSurfaceTemperatureC: 13.9
  },
  forecast: [],
  risk: {
    level: "low",
    reasons: ["Current sea state is below configured concern thresholds."]
  },
  limitations: ["Marine conditions are modelled at the nearest Open-Meteo sea grid point."]
};

describe("MarineWeatherPanel", () => {
  beforeEach(() => {
    cleanup();
    useMarineWeatherStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
  });

  it("requests weather for the analysed area", () => {
    const refresh = vi.fn(async () => undefined);
    useMarineWeatherStore.setState({ refresh });

    render(<MarineWeatherPanel area={area} />);

    expect(refresh).toHaveBeenCalledWith(area.bounds);
  });

  it("renders live marine conditions without provider internals", () => {
    useMarineWeatherStore.setState({
      status: "success",
      result: weather
    });

    render(<MarineWeatherPanel area={area} />);

    expect(screen.getAllByText(/0.8 m waves/i)).toHaveLength(2);
    expect(screen.getByText("0.4 kt")).toBeTruthy();
    expect(screen.getByText(/Weather data by Open-Meteo/i)).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("wave_height");
  });

  it("renders provider not-configured state clearly", () => {
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
      limitations: ["Enable MARINE_WEATHER_MODE=live to fetch Open-Meteo marine context."]
    };
    useMarineWeatherStore.setState({
      status: "success",
      result: notConfigured
    });

    render(<MarineWeatherPanel area={area} />);

    expect(screen.getByText("Provider not configured")).toBeTruthy();
    expect(screen.getByText(/MARINE_WEATHER_MODE=live/i)).toBeTruthy();
  });

  it("does not render cached weather from a different area", () => {
    useMarineWeatherStore.setState({
      status: "success",
      result: {
        ...weather,
        area: { south: 49.9, west: -1.28, north: 50.1, east: -0.86 },
        current: {
          time: timestamp,
          waveHeightM: 2.4
        }
      }
    });

    render(<MarineWeatherPanel area={area} />);

    expect(screen.getByText("Live area context")).toBeTruthy();
    expect(screen.queryByText(/2.4 m waves/i)).toBeNull();
  });
});

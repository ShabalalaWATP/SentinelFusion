import type { MarineWeatherResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IMarineWeatherService } from "../domain/interfaces";
import {
  mockMarineWeather,
  notConfiguredMarineWeather,
  openMeteoMarineResponseSchema,
  providerError,
  toMarineWeatherResponse
} from "./marine-weather-response";

const providerUrl = "https://marine-api.open-meteo.com/v1/marine";
const forecastHours = 6;

type Fetcher = typeof fetch;
type CacheEntry = {
  expiresAtMs: number;
  response: MarineWeatherResponse;
};

export class MarineWeatherService implements IMarineWeatherService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly config: AppConfig,
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaWeather(bounds: TrafficAreaBounds): Promise<MarineWeatherResponse> {
    const now = this.now();
    const generatedAt = now.toISOString();
    const location = centreOfBounds(bounds);

    if (this.config.marineWeatherMode === "off") {
      return notConfiguredMarineWeather(bounds, location, generatedAt);
    }

    if (this.config.marineWeatherMode === "mock") {
      return mockMarineWeather(bounds, location, generatedAt);
    }

    const cacheKey = cacheKeyFor(bounds, location);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > now.getTime()) {
      return { ...cached.response, cached: true, generatedAt };
    }

    try {
      const response = await this.fetcher(buildOpenMeteoUrl(location), {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(this.config.marineWeatherTimeoutMs)
      });

      if (!response.ok) {
        return providerError(bounds, location, generatedAt, `Open-Meteo returned HTTP ${response.status}.`);
      }

      const payload = openMeteoMarineResponseSchema.parse(await response.json());
      const parsed = toMarineWeatherResponse(bounds, payload, generatedAt);
      this.cacheResponse(cacheKey, parsed, now);

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Open-Meteo request failed.";
      return providerError(bounds, location, generatedAt, message);
    }
  }

  private cacheResponse(cacheKey: string, response: MarineWeatherResponse, now: Date): void {
    if (this.config.marineWeatherCacheSeconds <= 0) {
      return;
    }

    if (this.cache.size >= this.config.marineWeatherCacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      expiresAtMs: now.getTime() + this.config.marineWeatherCacheSeconds * 1000,
      response
    });
  }
}

function buildOpenMeteoUrl(location: { latitude: number; longitude: number }): URL {
  const url = new URL(providerUrl);
  url.searchParams.set("latitude", location.latitude.toFixed(5));
  url.searchParams.set("longitude", location.longitude.toFixed(5));
  url.searchParams.set(
    "current",
    [
      "wave_height",
      "wave_direction",
      "wave_period",
      "wind_wave_height",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "sea_surface_temperature",
      "ocean_current_velocity",
      "ocean_current_direction"
    ].join(",")
  );
  url.searchParams.set("hourly", "wave_height,wave_period,wind_wave_height,swell_wave_height");
  url.searchParams.set("forecast_hours", String(forecastHours));
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("length_unit", "metric");
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("cell_selection", "sea");

  return url;
}

function centreOfBounds(bounds: TrafficAreaBounds): { latitude: number; longitude: number } {
  const latitude = (bounds.south + bounds.north) / 2;
  const longitude =
    bounds.west <= bounds.east
      ? (bounds.west + bounds.east) / 2
      : normaliseLongitude((bounds.west + bounds.east + 360) / 2);

  return { latitude, longitude };
}

function cacheKeyFor(
  bounds: TrafficAreaBounds,
  location: { latitude: number; longitude: number }
): string {
  return [
    location.latitude.toFixed(2),
    location.longitude.toFixed(2),
    bounds.south.toFixed(4),
    bounds.west.toFixed(4),
    bounds.north.toFixed(4),
    bounds.east.toFixed(4)
  ].join(":");
}

function normaliseLongitude(value: number): number {
  if (value > 180) {
    return value - 360;
  }

  if (value < -180) {
    return value + 360;
  }

  return value;
}

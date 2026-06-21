import type { MarineWeatherResponse, RiskLevel, TrafficAreaBounds } from "@aisstream/shared";
import { z } from "zod";

const marineWeatherProviderSource = {
  title: "Open-Meteo Marine Weather",
  url: "https://open-meteo.com/en/docs/marine-weather-api",
  attribution: "Weather data by Open-Meteo"
};

const nullableNumberArray = z.array(z.number().nullable());

export const openMeteoMarineResponseSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  current: z.record(z.unknown()).optional(),
  hourly: z
    .object({
      time: z.array(z.number()).optional(),
      wave_height: nullableNumberArray.optional(),
      wave_period: nullableNumberArray.optional(),
      wind_wave_height: nullableNumberArray.optional(),
      swell_wave_height: nullableNumberArray.optional()
    })
    .optional()
});

export function toMarineWeatherResponse(
  area: TrafficAreaBounds,
  payload: z.infer<typeof openMeteoMarineResponseSchema>,
  generatedAt: string
): MarineWeatherResponse {
  const current = conditionFromRecord(payload.current);

  return {
    status: "ok",
    mode: "live",
    source: marineWeatherProviderSource,
    generatedAt,
    cached: false,
    area,
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
      label: "Nearest sea grid point"
    },
    ...(current ? { current } : {}),
    forecast: forecastFromHourly(payload.hourly),
    risk: assessMarineWeatherRisk(current),
    limitations: [
      "Marine conditions are modelled at the nearest Open-Meteo sea grid point.",
      "Short forecasts are decision-support context, not navigational advice."
    ]
  };
}

export function providerError(
  area: TrafficAreaBounds,
  location: { latitude: number; longitude: number },
  generatedAt: string,
  message: string
): MarineWeatherResponse {
  return {
    status: "error",
    mode: "live",
    source: marineWeatherProviderSource,
    generatedAt,
    cached: false,
    area,
    location: { ...location, label: "Selected area centre" },
    forecast: [],
    risk: {
      level: "medium",
      reasons: ["Marine weather provider is currently unavailable."]
    },
    limitations: ["Retry later or switch MARINE_WEATHER_MODE=mock for offline development."],
    error: message.slice(0, 240)
  };
}

export function notConfiguredMarineWeather(
  area: TrafficAreaBounds,
  location: { latitude: number; longitude: number },
  generatedAt: string
): MarineWeatherResponse {
  return {
    status: "not_configured",
    mode: "live",
    source: marineWeatherProviderSource,
    generatedAt,
    cached: false,
    area,
    location: { ...location, label: "Selected area centre" },
    forecast: [],
    risk: {
      level: "low",
      reasons: ["Marine weather provider is not configured for this deployment."]
    },
    limitations: ["Enable MARINE_WEATHER_MODE=live to fetch Open-Meteo marine context."]
  };
}

export function mockMarineWeather(
  area: TrafficAreaBounds,
  location: { latitude: number; longitude: number },
  generatedAt: string
): MarineWeatherResponse {
  const current = {
    time: generatedAt,
    waveHeightM: 0.8,
    waveDirectionDeg: 230,
    wavePeriodSeconds: 4.5,
    windWaveHeightM: 0.5,
    swellWaveHeightM: 0.6,
    swellWaveDirectionDeg: 245,
    swellWavePeriodSeconds: 5.2,
    seaSurfaceTemperatureC: 13.9,
    oceanCurrentVelocityKt: 0.4,
    oceanCurrentDirectionDeg: 80
  };

  return {
    status: "ok",
    mode: "mock",
    source: marineWeatherProviderSource,
    generatedAt,
    cached: false,
    area,
    location: { ...location, label: "Mock selected area centre" },
    current,
    forecast: [0, 1, 2].map((offset) => ({
      time: new Date(Date.parse(generatedAt) + offset * 60 * 60 * 1000).toISOString(),
      waveHeightM: 0.8 + offset * 0.1,
      wavePeriodSeconds: 4.5 + offset * 0.2,
      windWaveHeightM: 0.5 + offset * 0.1,
      swellWaveHeightM: 0.6
    })),
    risk: {
      level: "low",
      reasons: ["Mock marine weather is below configured concern thresholds."]
    },
    limitations: ["Mock marine weather is for offline development only."]
  };
}

function conditionFromRecord(record: Record<string, unknown> | undefined) {
  if (!record || typeof record.time !== "number") {
    return undefined;
  }

  return {
    time: toIsoTime(record.time),
    ...(numberField(record.wave_height) !== undefined
      ? { waveHeightM: numberField(record.wave_height) }
      : {}),
    ...(degreeField(record.wave_direction) !== undefined
      ? { waveDirectionDeg: degreeField(record.wave_direction) }
      : {}),
    ...(numberField(record.wave_period) !== undefined
      ? { wavePeriodSeconds: numberField(record.wave_period) }
      : {}),
    ...(numberField(record.wind_wave_height) !== undefined
      ? { windWaveHeightM: numberField(record.wind_wave_height) }
      : {}),
    ...(numberField(record.swell_wave_height) !== undefined
      ? { swellWaveHeightM: numberField(record.swell_wave_height) }
      : {}),
    ...(degreeField(record.swell_wave_direction) !== undefined
      ? { swellWaveDirectionDeg: degreeField(record.swell_wave_direction) }
      : {}),
    ...(numberField(record.swell_wave_period) !== undefined
      ? { swellWavePeriodSeconds: numberField(record.swell_wave_period) }
      : {}),
    ...(numberField(record.sea_surface_temperature) !== undefined
      ? { seaSurfaceTemperatureC: numberField(record.sea_surface_temperature) }
      : {}),
    ...(numberField(record.ocean_current_velocity) !== undefined
      ? { oceanCurrentVelocityKt: numberField(record.ocean_current_velocity) }
      : {}),
    ...(degreeField(record.ocean_current_direction) !== undefined
      ? { oceanCurrentDirectionDeg: degreeField(record.ocean_current_direction) }
      : {})
  };
}

function forecastFromHourly(
  hourly: z.infer<typeof openMeteoMarineResponseSchema>["hourly"]
) {
  const times = hourly?.time ?? [];

  return times.slice(0, 6).map((time, index) => ({
    time: toIsoTime(time),
    ...(arrayNumberAt(hourly?.wave_height, index) !== undefined
      ? { waveHeightM: arrayNumberAt(hourly?.wave_height, index) }
      : {}),
    ...(arrayNumberAt(hourly?.wave_period, index) !== undefined
      ? { wavePeriodSeconds: arrayNumberAt(hourly?.wave_period, index) }
      : {}),
    ...(arrayNumberAt(hourly?.wind_wave_height, index) !== undefined
      ? { windWaveHeightM: arrayNumberAt(hourly?.wind_wave_height, index) }
      : {}),
    ...(arrayNumberAt(hourly?.swell_wave_height, index) !== undefined
      ? { swellWaveHeightM: arrayNumberAt(hourly?.swell_wave_height, index) }
      : {})
  }));
}

function assessMarineWeatherRisk(current: ReturnType<typeof conditionFromRecord>): {
  level: RiskLevel;
  reasons: string[];
} {
  if (!current) {
    return {
      level: "medium",
      reasons: ["Provider response did not include current marine conditions."]
    };
  }

  const reasons: string[] = [];
  const waveHeight = current.waveHeightM ?? current.swellWaveHeightM ?? current.windWaveHeightM;
  const currentVelocity = current.oceanCurrentVelocityKt;

  if (waveHeight !== undefined && waveHeight >= 4) {
    reasons.push(`Wave height is ${waveHeight.toFixed(1)} m.`);
  }
  if (currentVelocity !== undefined && currentVelocity >= 4) {
    reasons.push(`Ocean current is ${currentVelocity.toFixed(1)} kt.`);
  }
  if (reasons.length > 0) {
    return { level: "high", reasons };
  }

  if (waveHeight !== undefined && waveHeight >= 2) {
    reasons.push(`Wave height is ${waveHeight.toFixed(1)} m.`);
  }
  if (currentVelocity !== undefined && currentVelocity >= 2) {
    reasons.push(`Ocean current is ${currentVelocity.toFixed(1)} kt.`);
  }

  return reasons.length > 0
    ? { level: "medium", reasons }
    : {
        level: "low",
        reasons: ["Current sea state is below configured concern thresholds."]
      };
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function degreeField(value: unknown): number | undefined {
  const number = numberField(value);
  return number === undefined ? undefined : Math.min(360, Math.max(0, number));
}

function arrayNumberAt(values: Array<number | null> | undefined, index: number): number | undefined {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toIsoTime(value: number): string {
  return new Date(value * 1000).toISOString();
}

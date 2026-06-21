import { describe, expect, it } from "vitest";
import type { ConflictContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import {
  mockConflictContext,
  notConfiguredConflictContext,
  providerErrorConflictContext,
  toConflictContextResponse
} from "../src/context/conflict-context-response";
import {
  mockMarineWeather,
  notConfiguredMarineWeather,
  providerError,
  toMarineWeatherResponse
} from "../src/context/marine-weather-response";

const area: TrafficAreaBounds = {
  south: 50.7,
  west: -1.4,
  north: 51.0,
  east: -0.9
};
const generatedAt = "2026-06-11T10:00:00.000Z";
const location = { latitude: 50.85, longitude: -1.15 };

describe("marine weather response builders", () => {
  it("converts current and hourly Open-Meteo data into high-risk marine context", () => {
    const response = toMarineWeatherResponse(
      area,
      {
        latitude: 50.85,
        longitude: -1.15,
        current: {
          time: 1_780_000_000,
          wave_height: 4.2,
          wave_direction: 400,
          wave_period: 9.5,
          wind_wave_height: 2.2,
          swell_wave_height: 3.1,
          swell_wave_direction: -10,
          swell_wave_period: 10.2,
          sea_surface_temperature: 12.4,
          ocean_current_velocity: 4.4,
          ocean_current_direction: 85
        },
        hourly: {
          time: [1_780_000_000, 1_780_003_600, 1_780_007_200],
          wave_height: [4.2, null, 2.1],
          wave_period: [9.5, 8.8, null],
          wind_wave_height: [2.2, 1.9, 1.5],
          swell_wave_height: [3.1, 2.8, 2.4]
        }
      },
      generatedAt
    );

    expect(response).toMatchObject({
      status: "ok",
      mode: "live",
      generatedAt,
      area,
      location: {
        latitude: 50.85,
        longitude: -1.15,
        label: "Nearest sea grid point"
      },
      current: {
        waveHeightM: 4.2,
        waveDirectionDeg: 360,
        swellWaveDirectionDeg: 0,
        oceanCurrentVelocityKt: 4.4
      },
      risk: {
        level: "high",
        reasons: ["Wave height is 4.2 m.", "Ocean current is 4.4 kt."]
      }
    });
    expect(response.forecast).toHaveLength(3);
    expect(response.forecast[1]).not.toHaveProperty("waveHeightM");
  });

  it("handles missing current conditions, provider failures, disabled mode, and mock mode", () => {
    expect(
      toMarineWeatherResponse(
        area,
        { latitude: 50.85, longitude: -1.15, current: {}, hourly: { time: [] } },
        generatedAt
      )
    ).toMatchObject({
      status: "ok",
      risk: {
        level: "medium",
        reasons: ["Provider response did not include current marine conditions."]
      }
    });

    expect(providerError(area, location, generatedAt, "x".repeat(260))).toMatchObject({
      status: "error",
      mode: "live",
      location: { ...location, label: "Selected area centre" },
      risk: { level: "medium" },
      error: "x".repeat(240)
    });
    expect(notConfiguredMarineWeather(area, location, generatedAt)).toMatchObject({
      status: "not_configured",
      forecast: [],
      risk: { level: "low" }
    });
    expect(mockMarineWeather(area, location, generatedAt)).toMatchObject({
      status: "ok",
      mode: "mock",
      location: { ...location, label: "Mock selected area centre" },
      risk: { level: "low" }
    });
  });
});

describe("conflict context response builders", () => {
  const events: ConflictContextResponse["events"] = [
    {
      id: "low-protest",
      eventDate: "2026-06-09",
      eventType: "Protests",
      subEventType: "Peaceful protest",
      disorderType: "Demonstrations",
      location: "Portsmouth",
      latitude: 50.8,
      longitude: -1.1,
      geoPrecision: 1,
      geocodingConfidence: "high",
      fatalities: 0,
      severity: "low",
      sourceName: "Local source",
      sourceScale: "Local",
      notes: "Peaceful demonstration."
    },
    {
      id: "high-battle",
      eventDate: "2026-06-08",
      eventType: "Battles",
      subEventType: "Armed clash",
      disorderType: "Political violence",
      location: "Harbour",
      latitude: 50.82,
      longitude: -1.12,
      geoPrecision: 2,
      geocodingConfidence: "medium",
      fatalities: 1,
      severity: "high",
      sourceName: "Security source",
      sourceScale: "Regional",
      notes: "Reported violence near the port."
    },
    {
      id: "medium-riot",
      eventDate: "2026-06-10",
      eventType: "Riots",
      subEventType: "Violent demonstration",
      disorderType: "Demonstrations",
      location: "City centre",
      latitude: 50.81,
      longitude: -1.13,
      geoPrecision: 1,
      geocodingConfidence: "high",
      fatalities: 0,
      severity: "medium",
      sourceName: "News source",
      sourceScale: "National",
      notes: "Riot reported."
    }
  ];

  it("sorts events by risk, summarises counts, and records truncation limitations", () => {
    const response = toConflictContextResponse({
      area,
      cached: true,
      events: [...events],
      generatedAt,
      lookbackDays: 14,
      maxResults: 2,
      providerRows: 5,
      truncated: true
    });

    expect(response.events.map((event) => event.id)).toEqual(["high-battle", "medium-riot"]);
    expect(response.summary).toEqual({
      count: 2,
      protestCount: 0,
      riotCount: 1,
      politicalViolenceCount: 1,
      fatalityCount: 1,
      highSeverityCount: 1,
      latestEventDate: "2026-06-10"
    });
    expect(response.risk).toEqual({
      level: "high",
      reasons: ["2 recent events include political violence or reported fatalities."]
    });
    expect(response.limitations).toContain(
      "Provider rows were capped before processing to protect API availability."
    );
    expect(response.limitations).toContain(
      "Showing the most relevant 2 events from 5 provider rows."
    );
  });

  it("returns useful fallback states for empty, mock, disabled, and provider-error responses", () => {
    expect(
      toConflictContextResponse({
        area,
        cached: false,
        events: [],
        generatedAt,
        lookbackDays: 7,
        maxResults: 10,
        providerRows: 0,
        truncated: false
      })
    ).toMatchObject({
      summary: {
        count: 0,
        protestCount: 0,
        riotCount: 0,
        politicalViolenceCount: 0,
        fatalityCount: 0,
        highSeverityCount: 0
      },
      risk: {
        level: "low",
        reasons: ["No reported conflict or protest events were returned for this area."]
      }
    });
    expect(mockConflictContext(area, generatedAt, 14, 1)).toMatchObject({
      status: "ok",
      mode: "mock",
      provider: "mock",
      summary: { count: 1 }
    });
    expect(
      notConfiguredConflictContext(area, generatedAt, "live", 14, {
        limitation: "Missing key.",
        reason: "Credentials not supplied."
      })
    ).toMatchObject({
      status: "not_configured",
      limitations: ["Missing key."],
      risk: { level: "low", reasons: ["Credentials not supplied."] }
    });
    expect(
      providerErrorConflictContext(
        area,
        generatedAt,
        "live",
        14,
        "Bearer secret-token-123 failed ".repeat(12)
      )
    ).toMatchObject({
      status: "error",
      risk: { level: "medium" }
    });
    expect(
      providerErrorConflictContext(
        area,
        generatedAt,
        "live",
        14,
        "Bearer secret-token-123 failed"
      ).error
    ).toBe("Bearer [redacted] failed");
  });
});

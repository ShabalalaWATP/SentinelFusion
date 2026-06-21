import { describe, expect, it } from "vitest";
import type { FireContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import {
  mockAirportContext,
  notConfiguredAirportContext,
  providerErrorAirportContext,
  toAirportContextResponse
} from "../src/context/airport-context-response";
import {
  mockFireContext,
  notConfiguredFireContext,
  providerErrorFireContext,
  toFireContextResponse
} from "../src/context/firms-response";
import { normaliseFirmsCsv } from "../src/context/firms-normaliser";

const area: TrafficAreaBounds = {
  south: 50.7,
  west: -1.4,
  north: 51,
  east: -0.9
};
const generatedAt = "2026-06-11T10:00:00.000Z";

describe("airport context response builders", () => {
  it("summarises airports, runway lengths, focus, and truncation limits", () => {
    const response = toAirportContextResponse({
      area,
      cached: true,
      focus: { latitude: 50.8, longitude: -1.1, label: "Selected aircraft" },
      generatedAt,
      airportsTruncated: true,
      runwaysTruncated: true,
      fallbackReason: "Using cached airport data.",
      airports: [
        {
          id: "1",
          ident: "EGHI",
          type: "medium_airport",
          name: "Southampton Airport",
          latitude: 50.9503,
          longitude: -1.3568,
          isoCountry: "GB",
          scheduledService: true,
          distanceKm: 12.4,
          runways: [
            {
              id: "r1",
              lengthFt: 5653,
              widthFt: 121,
              surface: "ASP",
              lighted: true,
              closed: false
            }
          ]
        },
        {
          id: "2",
          ident: "EGHH",
          type: "large_airport",
          name: "Bournemouth Airport",
          latitude: 50.78,
          longitude: -1.84,
          isoCountry: "GB",
          scheduledService: false,
          distanceKm: 34.1,
          runways: [{ id: "r2", lengthFt: 7451, closed: false }]
        }
      ]
    });

    expect(response.summary).toEqual({
      count: 2,
      scheduledServiceCount: 1,
      runwayCount: 2,
      nearestDistanceKm: 12.4,
      longestRunwayFt: 7451
    });
    expect(response.limitations).toEqual([
      "Using cached airport data.",
      "OurAirports is public-domain community data and is not authoritative aeronautical information.",
      "Closed airports and closed runways are excluded; runway details may be incomplete or stale.",
      "Airport provider rows were capped before processing.",
      "Runway provider rows were capped before processing."
    ]);
  });

  it("returns clear airport fallback, provider error, and mock responses", () => {
    expect(notConfiguredAirportContext(generatedAt, { area, reason: "Disabled by config." })).toMatchObject({
      status: "not_configured",
      area,
      summary: { count: 0, scheduledServiceCount: 0, runwayCount: 0 },
      error: "Disabled by config."
    });
    expect(
      providerErrorAirportContext(generatedAt, "network failed", {
        focus: { latitude: 50.8, longitude: -1.1 }
      })
    ).toMatchObject({
      status: "error",
      focus: { latitude: 50.8, longitude: -1.1 },
      error: "network failed"
    });
    expect(mockAirportContext(generatedAt, { area })).toMatchObject({
      status: "ok",
      mode: "mock",
      area,
      summary: { count: 1, scheduledServiceCount: 1, runwayCount: 1 }
    });
  });
});

describe("FIRMS fire context response builders", () => {
  const detections: FireContextResponse["detections"] = [
    {
      id: "low",
      latitude: 50.8,
      longitude: -1.1,
      acquiredAt: "2026-06-10T08:30:00.000Z",
      confidence: "low",
      dayNight: "day",
      fireRadiativePowerMw: 12
    },
    {
      id: "nominal-strong",
      latitude: 50.81,
      longitude: -1.12,
      acquiredAt: "2026-06-10T09:30:00.000Z",
      confidence: "nominal",
      dayNight: "night",
      fireRadiativePowerMw: 70
    },
    {
      id: "high",
      latitude: 50.82,
      longitude: -1.13,
      acquiredAt: "2026-06-10T07:30:00.000Z",
      confidence: "high",
      dayNight: "day",
      fireRadiativePowerMw: 25
    }
  ];

  it("sorts detections by confidence and strength, summarises risk, and records caps", () => {
    const response = toFireContextResponse({
      area,
      dayRange: 1,
      detections: [...detections],
      generatedAt,
      cached: true,
      maxDetections: 2,
      providerRows: 5,
      sourceDataset: "VIIRS_SNPP_NRT",
      truncated: true
    });

    expect(response.detections.map((detection) => detection.id)).toEqual(["high", "nominal-strong"]);
    expect(response.summary).toMatchObject({
      count: 2,
      highConfidenceCount: 1,
      dayCount: 1,
      nightCount: 1,
      maxFireRadiativePowerMw: 70
    });
    expect(response.risk).toEqual({
      level: "high",
      reasons: ["2 active fire detections include strong confidence or FRP signals."]
    });
    expect(response.limitations).toContain(
      "Showing the strongest 2 detections from 5 provider rows."
    );
  });

  it("normalises FIRMS CSV rows, quoted fields, confidence values, and truncation", () => {
    const csv = [
      "latitude,longitude,acq_date,acq_time,confidence,satellite,instrument,version,daynight,bright_ti4,frp,scan,track",
      "50.800,-1.100,2026-06-10,830,h,N,VIIRS,2.0,D,331.4,18.6,0.4,0.5",
      "\"50.810\",\"-1.120\",2026-06-10,0930,85,N,VIIRS,2.0,N,340.1,55.2,0.6,0.7",
      "bad,-1.130,2026-06-10,1060,l,N,VIIRS,2.0,D,300.0,3.2,0.3,0.3"
    ].join("\n");

    const result = normaliseFirmsCsv(csv, "VIIRS_SNPP_NRT", 2);

    expect(result.providerRows).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.detections).toHaveLength(2);
    expect(result.detections[0]).toMatchObject({
      latitude: 50.8,
      longitude: -1.1,
      confidence: "high",
      dayNight: "day",
      fireRadiativePowerMw: 18.6,
      scanKm: 0.4,
      trackKm: 0.5
    });
    expect(result.detections[1]).toMatchObject({
      confidence: "high",
      dayNight: "night",
      acquiredAt: "2026-06-10T09:30:00.000Z"
    });
    expect(() => normaliseFirmsCsv("lat,lon\n50,-1", "VIIRS_SNPP_NRT", 10)).toThrow(
      "expected CSV headers"
    );
  });

  it("returns useful fire fallback states", () => {
    expect(
      toFireContextResponse({
        area,
        dayRange: 1,
        detections: [],
        generatedAt,
        cached: false,
        maxDetections: 10,
        providerRows: 0,
        sourceDataset: "VIIRS_SNPP_NRT",
        truncated: false
      })
    ).toMatchObject({
      summary: { count: 0, highConfidenceCount: 0, dayCount: 0, nightCount: 0 },
      risk: {
        level: "low",
        reasons: ["No active fire detections were returned for this area."]
      }
    });
    expect(notConfiguredFireContext(area, generatedAt, "VIIRS_SNPP_NRT", 1)).toMatchObject({
      status: "not_configured",
      risk: { level: "low" }
    });
    expect(mockFireContext(area, generatedAt, "VIIRS_SNPP_NRT", 1)).toMatchObject({
      status: "ok",
      mode: "mock",
      summary: { count: 1 }
    });
    expect(providerErrorFireContext(area, generatedAt, "VIIRS_SNPP_NRT", 1, "x".repeat(260))).toMatchObject({
      status: "error",
      error: "x".repeat(240),
      risk: { level: "medium" }
    });
  });
});

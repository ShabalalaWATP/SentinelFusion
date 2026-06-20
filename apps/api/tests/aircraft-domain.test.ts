import { describe, expect, it } from "vitest";
import type { Aircraft } from "@aisstream/shared";
import { AircraftAnalyticsService } from "../src/analytics/aircraft-analytics-service";
import { InMemoryAircraftRepository } from "../src/domain/aircraft-repository";
import { normaliseLongitude } from "../src/flights/mock-flight-tracking-client";

const now = "2026-06-11T10:00:00.000Z";

describe("aircraft domain services", () => {
  it("stores and sorts aircraft by recognisable label", () => {
    const repository = new InMemoryAircraftRepository();
    repository.upsert(sampleAircraft({ id: "icao24-bbbbbb", icao24: "bbbbbb" }));
    repository.upsert(sampleAircraft({ id: "icao24-aaaaaa", icao24: "aaaaaa", callsign: "AAA1" }));

    expect(repository.getById("icao24-aaaaaa")?.callsign).toBe("AAA1");
    expect(repository.getAll().map((aircraft) => aircraft.id)).toEqual([
      "icao24-aaaaaa",
      "icao24-bbbbbb"
    ]);
  });

  it("calculates aircraft metrics without exposing provider details", () => {
    const service = new AircraftAnalyticsService();
    const metrics = service.calculate(
      [
        sampleAircraft({
          altitudeFt: 30000,
          groundSpeedKt: 430,
          classification: "military"
        }),
        sampleAircraft({
          id: "icao24-40621b",
          icao24: "40621b",
          altitudeFt: 36000,
          emergency: true,
          groundSpeedKt: 470
        })
      ],
      new Date("2026-06-11T10:00:10.000Z")
    );

    expect(metrics).toMatchObject({
      liveAircraft: 2,
      trackedAircraft: 2,
      militaryAircraft: 1,
      emergencyAircraft: 1,
      averageAltitudeFt: 33000,
      averageGroundSpeedKt: 450,
      dataLatencyMs: 10000
    });
  });

  it("keeps long-running mock flight positions inside valid longitude bounds", () => {
    expect(normaliseLongitude(-1607.155)).toBeGreaterThanOrEqual(-180);
    expect(normaliseLongitude(-1607.155)).toBeLessThanOrEqual(180);
    expect(normaliseLongitude(181)).toBe(-179);
    expect(normaliseLongitude(-181)).toBe(179);
  });
});

function sampleAircraft(overrides: Partial<Aircraft> = {}): Aircraft {
  return {
    id: "icao24-400abc",
    icao24: "400abc",
    callsign: "TEST1",
    longitude: -1,
    latitude: 51,
    altitudeFt: 30000,
    groundSpeedKt: 400,
    emergency: false,
    onGround: false,
    classification: "commercial",
    riskLevel: "low",
    source: "mock",
    lastUpdated: now,
    track: [{ longitude: -1.1, latitude: 50.9, altitudeFt: 29000, timestamp: now }],
    ...overrides
  };
}

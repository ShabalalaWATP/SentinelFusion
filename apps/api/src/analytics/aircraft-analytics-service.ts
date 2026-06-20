import type { Aircraft, AircraftMetrics } from "@aisstream/shared";
import type { IAircraftAnalyticsService } from "../domain/interfaces";

export class AircraftAnalyticsService implements IAircraftAnalyticsService {
  calculate(aircraft: Aircraft[], now = new Date()): AircraftMetrics {
    const airborne = aircraft.filter((item) => !item.onGround);
    const altitudeSamples = airborne
      .map((item) => item.altitudeFt)
      .filter((value): value is number => typeof value === "number");
    const speedSamples = aircraft
      .map((item) => item.groundSpeedKt)
      .filter((value): value is number => typeof value === "number");
    const newestTimestamp = aircraft.reduce((latest, item) => {
      const current = Date.parse(item.lastUpdated);
      return Number.isFinite(current) ? Math.max(latest, current) : latest;
    }, 0);

    return {
      liveAircraft: aircraft.length,
      trackedAircraft: aircraft.length,
      militaryAircraft: aircraft.filter((item) => item.classification === "military").length,
      emergencyAircraft: aircraft.filter((item) => item.emergency).length,
      averageAltitudeFt: average(altitudeSamples),
      averageGroundSpeedKt: average(speedSamples),
      dataLatencyMs:
        newestTimestamp === 0 ? 0 : Math.max(0, now.getTime() - newestTimestamp),
      lastUpdated: now.toISOString()
    };
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

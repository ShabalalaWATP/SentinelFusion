import type { Vessel, VesselMetrics } from "@aisstream/shared";
import type { IVesselAnalyticsService } from "../domain/interfaces";

export class VesselAnalyticsService implements IVesselAnalyticsService {
  calculate(vessels: Vessel[], now = new Date()): VesselMetrics {
    const totalSpeed = vessels.reduce(
      (sum, vessel) => sum + vessel.speedOverGround,
      0
    );
    const newestTimestamp = vessels.reduce((latest, vessel) => {
      const current = Date.parse(vessel.lastUpdated);
      return Number.isFinite(current) ? Math.max(latest, current) : latest;
    }, 0);

    return {
      liveVessels: vessels.length,
      trackedVessels: vessels.length,
      highRiskVessels: vessels.filter((vessel) => vessel.riskLevel === "high").length,
      averageSpeed: vessels.length === 0 ? 0 : Number((totalSpeed / vessels.length).toFixed(1)),
      dataLatencyMs:
        newestTimestamp === 0 ? 0 : Math.max(0, now.getTime() - newestTimestamp),
      lastUpdated: now.toISOString()
    };
  }
}

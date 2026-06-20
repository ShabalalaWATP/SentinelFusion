import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { buildAlertItems } from "./alertModels";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-111000111",
  mmsi: "111000111",
  name: "WATCHED WARSHIP",
  shipType: "AIS type 35",
  longitude: 1,
  latitude: 50,
  speedOverGround: 12,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "high",
  lastUpdated: timestamp,
  track: []
};

describe("buildAlertItems", () => {
  it("combines live risk and watch-rule events with persisted alert status", () => {
    const alerts = buildAlertItems({
      acknowledged: { [`vessel-${vessel.id}-high-risk`]: timestamp },
      dismissed: {},
      vessels: [vessel],
      aircraft: [],
      anomalies: [],
      events: [
        {
          id: "event-1",
          ruleId: "hormuz-all",
          ruleLabel: "All traffic in Strait of Hormuz",
          entityId: vessel.id,
          entityLabel: vessel.name,
          entityDomain: "vessel",
          eventType: "entered",
          occurredAt: timestamp
        }
      ]
    });

    expect(alerts.some((alert) => alert.source === "Saved watch rule")).toBe(true);
    expect(alerts.find((alert) => alert.id === `vessel-${vessel.id}-high-risk`)?.status).toBe("acknowledged");
  });
});

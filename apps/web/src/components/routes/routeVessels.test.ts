import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { selectRouteVessels } from "./routeVessels";

const timestamp = "2026-06-11T10:00:00.000Z";

const baseVessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 3,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};

describe("selectRouteVessels", () => {
  it("returns only vessels with visible track lines, ordered by speed", () => {
    const slowRoute = {
      ...baseVessel,
      id: "mmsi-232001245",
      mmsi: "232001245",
      name: "SLOW ROUTE",
      speedOverGround: 4,
      track: [
        { longitude: 1.2, latitude: 51.7, timestamp },
        { longitude: 1.3, latitude: 51.8, timestamp }
      ]
    };
    const fastRoute = {
      ...slowRoute,
      id: "mmsi-232001256",
      mmsi: "232001256",
      name: "FAST ROUTE",
      speedOverGround: 12
    };

    expect(selectRouteVessels([baseVessel, slowRoute, fastRoute]).map((vessel) => vessel.name)).toEqual([
      "FAST ROUTE",
      "SLOW ROUTE"
    ]);
  });

  it("keeps a selected routed vessel even when it falls outside the route cap", () => {
    const slowRoute = {
      ...baseVessel,
      id: "mmsi-232001245",
      mmsi: "232001245",
      name: "SLOW ROUTE",
      speedOverGround: 4,
      track: [
        { longitude: 1.2, latitude: 51.7, timestamp },
        { longitude: 1.3, latitude: 51.8, timestamp }
      ]
    };
    const fastRoute = {
      ...slowRoute,
      id: "mmsi-232001256",
      mmsi: "232001256",
      name: "FAST ROUTE",
      speedOverGround: 12
    };

    expect(
      selectRouteVessels([slowRoute, fastRoute], {
        limit: 1,
        selectedVesselId: slowRoute.id
      }).map((vessel) => vessel.name)
    ).toEqual(["FAST ROUTE", "SLOW ROUTE"]);
  });
});

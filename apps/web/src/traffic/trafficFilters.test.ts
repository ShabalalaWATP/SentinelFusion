import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import {
  countActiveAircraftFilters,
  defaultAircraftFilterSettings,
  filterAircraftByArea,
  filterAircraftBySettings,
  filterVesselsByArea,
  selectVisibleTraffic,
  summariseAreaTraffic
} from "./trafficFilters";

const now = "2026-06-11T10:00:00.000Z";
const bounds = { south: 25, west: 55, north: 27, east: 57 };

const vessel: Vessel = {
  id: "mmsi-123456789",
  mmsi: "123456789",
  name: "TEST VESSEL",
  shipType: "Cargo",
  longitude: 56,
  latitude: 26,
  speedOverGround: 12,
  courseOverGround: 90,
  navigationalStatus: "Under way",
  riskLevel: "high",
  lastUpdated: now,
  track: []
};

const aircraft: Aircraft = {
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW12",
  longitude: 58,
  latitude: 26,
  emergency: false,
  onGround: false,
  classification: "commercial",
  riskLevel: "low",
  source: "mock",
  lastUpdated: now,
  track: []
};

const militaryAircraft: Aircraft = {
  ...aircraft,
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: 56,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  classification: "military",
  riskLevel: "medium"
};

const emergencyAircraft: Aircraft = {
  ...aircraft,
  id: "icao24-4d2222",
  icao24: "4d2222",
  callsign: "MEDIC7",
  emergency: true,
  altitudeFt: 2500,
  groundSpeedKt: 120,
  classification: "government",
  riskLevel: "high"
};

const commercialAircraftInsideArea: Aircraft = {
  ...aircraft,
  longitude: 56
};

describe("trafficFilters", () => {
  it("filters vessels and aircraft by area bounds", () => {
    expect(filterVesselsByArea([vessel], bounds)).toHaveLength(1);
    expect(filterAircraftByArea([aircraft], bounds)).toHaveLength(0);
  });

  it("summarises area traffic", () => {
    const summary = summariseAreaTraffic([vessel], [aircraft], bounds);

    expect(summary.vesselCount).toBe(1);
    expect(summary.aircraftCount).toBe(0);
    expect(summary.highRiskVessels).toBe(1);
  });

  it("filters aircraft by search text, classification, emergency and ranges", () => {
    const aircraftList = [aircraft, militaryAircraft, emergencyAircraft];

    expect(
      filterAircraftBySettings(aircraftList, {
        ...defaultAircraftFilterSettings,
        query: "royal",
        classifications: ["military"],
        minAltitudeFt: 10000,
        minSpeedKt: 200
      })
    ).toEqual([militaryAircraft]);

    expect(
      filterAircraftBySettings(aircraftList, {
        ...defaultAircraftFilterSettings,
        emergencyOnly: true,
        maxAltitudeFt: 3000
      })
    ).toEqual([emergencyAircraft]);
  });

  it("counts active aircraft filter groups", () => {
    expect(
      countActiveAircraftFilters({
        ...defaultAircraftFilterSettings,
        query: "rfr",
        classifications: ["military", "government"],
        airborneOnly: true,
        maxSpeedKt: 350
      })
    ).toBe(4);
  });

  it("selects visible traffic using domain, area and aircraft filters", () => {
    const visible = selectVisibleTraffic([vessel], [commercialAircraftInsideArea, militaryAircraft], {
      activeAreaOnlyRule: null,
      aircraftFilters: {
        ...defaultAircraftFilterSettings,
        classifications: ["military"]
      },
      areaOnlyBounds: bounds,
      domainFilter: "all",
      selectedAircraftId: commercialAircraftInsideArea.id
    });

    expect(visible.vessels).toEqual([vessel]);
    expect(visible.aircraft).toEqual([militaryAircraft, commercialAircraftInsideArea]);

    expect(
      selectVisibleTraffic([vessel], [militaryAircraft], {
        activeAreaOnlyRule: null,
        aircraftFilters: defaultAircraftFilterSettings,
        domainFilter: "aircraft"
      }).vessels
    ).toEqual([]);
  });

  it("applies feed confidence filters after domain and area filters", () => {
    const staleVessel = {
      ...vessel,
      id: "mmsi-987654321",
      mmsi: "987654321",
      lastUpdated: "2026-06-11T09:00:00.000Z"
    };

    const visible = selectVisibleTraffic([vessel, staleVessel], [commercialAircraftInsideArea], {
      activeAreaOnlyRule: null,
      aircraftFilters: defaultAircraftFilterSettings,
      areaOnlyBounds: bounds,
      domainFilter: "all",
      feedConfidenceSettings: {
        hideStaleContacts: true,
        hideUnhealthyFeeds: false,
        maxContactAgeMinutes: 10
      },
      feedHealth: {
        aircraftHealthy: true,
        nowMs: Date.parse("2026-06-11T10:00:00.000Z"),
        vesselsHealthy: true
      },
      selectedVesselId: staleVessel.id
    });

    expect(visible.vessels).toEqual([vessel, staleVessel]);
    expect(visible.aircraft).toEqual([commercialAircraftInsideArea]);
  });
});

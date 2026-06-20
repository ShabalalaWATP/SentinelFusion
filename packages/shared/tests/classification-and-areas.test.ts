import { describe, expect, it } from "vitest";
import {
  classifyAircraft,
  classifyVessel,
  findTrafficAreaById,
  isCoordinateInsideBounds,
  isGovernmentVessel,
  isMilitaryVessel,
  resolveTrafficAreaByText
} from "../src";

describe("classification and areas", () => {
  it("flags known military vessel indicators", () => {
    expect(
      isMilitaryVessel({
        name: "HMS TEST",
        shipType: "AIS type 35"
      })
    ).toBe(true);
    expect(
      isMilitaryVessel({
        name: "MERCHANT TEST",
        shipType: "Cargo"
      })
    ).toBe(false);
  });

  it("flags known government vessel indicators", () => {
    expect(
      isGovernmentVessel({
        name: "BORDER FORCE TEST",
        shipType: "Patrol"
      })
    ).toBe(true);
    expect(
      classifyVessel({
        name: "COAST GUARD TEST",
        shipType: "Patrol"
      })
    ).toBe("military");
    expect(
      classifyVessel({
        name: "CUSTOMS LAUNCH",
        shipType: "Patrol"
      })
    ).toBe("government");
  });

  it("classifies aircraft from visible identity fields", () => {
    expect(
      classifyAircraft({
        callsign: "RFR123",
        operator: "Royal Air Force",
        aircraftType: "A400M"
      })
    ).toBe("military");
    expect(
      classifyAircraft({
        callsign: "POLICE01",
        operator: "National Police Air Service",
        aircraftType: "Helicopter"
      })
    ).toBe("government");
    expect(
      classifyAircraft({
        callsign: "BAW12",
        operator: "British Airways",
        aircraftType: "Boeing 777"
      })
    ).toBe("commercial");
  });

  it("resolves named operational traffic areas", () => {
    const match = resolveTrafficAreaByText("Track all activity across the Hormuz Strait");
    const hormuz = findTrafficAreaById("hormuz");

    expect(match?.area.id).toBe("hormuz");
    expect(hormuz?.name).toBe("Strait of Hormuz");
    expect(
      isCoordinateInsideBounds(
        { latitude: 26.5, longitude: 56.2 },
        match?.area.bounds ?? {
          south: 0,
          west: 0,
          north: 0,
          east: 0
        }
      )
    ).toBe(true);
  });
});

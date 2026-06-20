import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { MilitaryIntelPanel } from "./MilitaryIntelPanel";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "HMS TEST",
  shipType: "Military ops",
  longitude: -1.1,
  latitude: 50.8,
  speedOverGround: 8,
  courseOverGround: 90,
  navigationalStatus: "Under way using engine",
  riskLevel: "medium",
  lastUpdated: timestamp,
  track: []
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  originCountry: "United Kingdom",
  longitude: -1.75,
  latitude: 51.2,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "mock",
  lastUpdated: timestamp,
  track: []
};

describe("MilitaryIntelPanel", () => {
  it("renders classified vessels and aircraft with inspect actions", () => {
    const onInspectAircraft = vi.fn();
    const onInspectVessel = vi.fn();
    useAircraftFilterStore.getState().resetFilters();

    render(
      <MilitaryIntelPanel
        aircraft={[aircraft]}
        onInspectAircraft={onInspectAircraft}
        onInspectVessel={onInspectVessel}
        vessels={[vessel]}
      />
    );

    expect(screen.getByText("Sea and air contacts")).toBeTruthy();
    expect(screen.getByText("RFR7182")).toBeTruthy();
    expect(screen.getByText("HMS TEST")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Focus RFR7182 on map/ }));
    fireEvent.click(screen.getByRole("button", { name: /Focus HMS TEST on map/ }));

    expect(onInspectAircraft).toHaveBeenCalledWith(aircraft);
    expect(onInspectVessel).toHaveBeenCalledWith(vessel);
  });
});

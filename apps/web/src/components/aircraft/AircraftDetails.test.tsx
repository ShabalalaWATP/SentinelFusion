import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft } from "@aisstream/shared";
import { useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { AircraftList, AircraftSummary } from "./AircraftDetails";

const timestamp = "2026-06-21T10:00:00.000Z";

describe("AircraftDetails", () => {
  beforeEach(() => {
    cleanup();
    useAircraftFilterStore.getState().resetFilters();
  });

  it("renders aircraft identity badges and formatted detail values", () => {
    render(<AircraftSummary aircraft={militaryAircraft} />);

    expect(screen.getByText("RFR7182")).toBeTruthy();
    expect(screen.getByText("Airbus A400M Atlas")).toBeTruthy();
    expect(screen.getByText("Emergency")).toBeTruthy();
    expect(screen.getByText("Military")).toBeTruthy();
    expect(screen.getByText("43C6F1")).toBeTruthy();
    expect(screen.getByText("18,000 ft")).toBeTruthy();
    expect(screen.getByText("310 kt")).toBeTruthy();
    expect(screen.getByText("138 deg")).toBeTruthy();
    expect(screen.getByText("Royal Air Force")).toBeTruthy();
    expect(screen.getByText("EGLL to EGHH")).toBeTruthy();
    expect(screen.getByText("7001")).toBeTruthy();

    cleanup();
    render(<AircraftSummary aircraft={governmentAircraft} />);
    expect(screen.getByText("Gov")).toBeTruthy();

    cleanup();
    render(<AircraftSummary aircraft={commercialAircraft} />);
    expect(screen.getByText("Airliner")).toBeTruthy();
  });

  it("lists filtered aircraft, marks the selected aircraft, and calls inspect handlers", () => {
    const onInspectAircraft = vi.fn();

    render(
      <AircraftList
        aircraft={[militaryAircraft, governmentAircraft, commercialAircraft]}
        selectedAircraftId={governmentAircraft.id}
        onInspectAircraft={onInspectAircraft}
      />
    );

    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.getByText("RFR7182")).toBeTruthy();
    expect(screen.getByText("COAST01")).toBeTruthy();
    expect(screen.getByText("BAW123")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /BAW123/i }));
    expect(onInspectAircraft).toHaveBeenCalledWith(commercialAircraft);

    fireEvent.click(screen.getByRole("button", { name: "Military" }));
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.queryByText("BAW123")).toBeNull();
  });

  it("shows empty and unknown-value states", () => {
    useAircraftFilterStore.getState().setFilter("classifications", ["military"]);

    render(
      <AircraftList
        aircraft={[{ ...commercialAircraft, callsign: undefined, registration: undefined }]}
        selectedAircraftId={null}
        onInspectAircraft={vi.fn()}
      />
    );

    expect(screen.getByText("No aircraft match the current filters.")).toBeTruthy();

    cleanup();
    render(
      <AircraftSummary
        aircraft={{
          ...commercialAircraft,
          altitudeFt: undefined,
          groundSpeedKt: undefined,
          operator: undefined,
          originAirport: undefined,
          destinationAirport: undefined,
          originCountry: undefined,
          squawk: undefined,
          trackDegrees: undefined
        }}
      />
    );

    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(5);
  });
});

const militaryAircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  registration: "ZZ343",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  originAirport: "EGLL",
  destinationAirport: "EGHH",
  longitude: -1.1,
  latitude: 50.8,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  squawk: "7001",
  emergency: true,
  onGround: false,
  classification: "military",
  riskLevel: "high",
  source: "opensky",
  lastUpdated: timestamp,
  track: [{ longitude: -1.1, latitude: 50.8, altitudeFt: 18000, timestamp }]
};

const governmentAircraft: Aircraft = {
  ...militaryAircraft,
  id: "icao24-407abc",
  icao24: "407abc",
  callsign: "COAST01",
  aircraftType: "Beechcraft King Air",
  operator: "Maritime and Coastguard Agency",
  emergency: false,
  classification: "government",
  riskLevel: "medium"
};

const commercialAircraft: Aircraft = {
  ...militaryAircraft,
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW123",
  aircraftType: "Airbus A320",
  operator: "British Airways",
  emergency: false,
  classification: "commercial",
  riskLevel: "low"
};

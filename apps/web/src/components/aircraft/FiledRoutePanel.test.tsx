import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, FiledRouteContextResponse } from "@aisstream/shared";
import { useFiledRouteContextStore } from "../../stores/filedRouteContextStore";
import { FiledRoutePanel } from "./FiledRoutePanel";

const timestamp = "2026-06-21T12:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-407abc",
  icao24: "407abc",
  callsign: "RFR7182",
  classification: "military",
  emergency: false,
  latitude: 50.82,
  longitude: -1.21,
  lastUpdated: timestamp,
  onGround: false,
  originCountry: "United Kingdom",
  riskLevel: "medium",
  source: "mock",
  track: []
};
const notConfiguredContext: FiledRouteContextResponse = {
  status: "not_configured",
  mode: "off",
  provider: "flightaware",
  source: {
    title: "FlightAware AeroAPI",
    url: "https://www.flightaware.com/aeroapi/portal/documentation",
    attribution: "Licensed provider required"
  },
  generatedAt: timestamp,
  cached: false,
  aircraft: {
    aircraftId: aircraft.id,
    icao24: aircraft.icao24,
    callsign: aircraft.callsign
  },
  limitations: ["Filed route enrichment is not configured."],
  error: "Licensed filed-route provider is not configured."
};
const mockContext: FiledRouteContextResponse = {
  status: "ok",
  mode: "mock",
  provider: "mock",
  source: {
    title: "Mock filed route",
    url: "https://www.flightaware.com/aeroapi/portal/documentation",
    attribution: "Mock filed route context for local development"
  },
  generatedAt: timestamp,
  cached: false,
  aircraft: {
    aircraftId: aircraft.id,
    icao24: aircraft.icao24,
    callsign: aircraft.callsign
  },
  route: {
    callsign: aircraft.callsign,
    originAirport: "EGLL",
    destinationAirport: "EGJJ",
    scheduledDeparture: timestamp,
    scheduledArrival: timestamp,
    routeText: "EGLL CPT SAM EGJJ",
    waypoints: [
      { sequence: 0, ident: "EGLL", latitude: 51.47, longitude: -0.45 },
      { sequence: 1, ident: "CPT" },
      { sequence: 2, ident: "SAM" },
      { sequence: 3, ident: "EGJJ", latitude: 49.21, longitude: -2.2 }
    ],
    confidence: "low",
    status: "planned"
  },
  limitations: ["Mock filed routes are for offline UI development only."]
};

describe("FiledRoutePanel", () => {
  beforeEach(() => {
    cleanup();
    useFiledRouteContextStore.setState({
      statuses: {},
      results: {},
      errors: {},
      refresh: async () => undefined
    });
  });

  it("requests filed route context for the selected aircraft", () => {
    const refresh = vi.fn(async () => undefined);
    useFiledRouteContextStore.setState({ refresh });

    render(<FiledRoutePanel aircraft={aircraft} />);

    expect(refresh).toHaveBeenCalledWith(aircraft.id);
  });

  it("renders provider-not-configured status in readable text", () => {
    useFiledRouteContextStore.setState({
      statuses: { [aircraft.id]: "success" },
      results: { [aircraft.id]: notConfiguredContext }
    });

    render(<FiledRoutePanel aircraft={aircraft} />);

    expect(screen.getByText("Provider not configured")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toggle filed route" }));
    expect(screen.getByText("Licensed filed-route provider is not configured.")).toBeTruthy();
    expect(screen.queryByText("filedRouteContext")).toBeNull();
  });

  it("renders mock route details only when provided by the store", () => {
    useFiledRouteContextStore.setState({
      statuses: { [aircraft.id]: "success" },
      results: { [aircraft.id]: mockContext }
    });

    render(<FiledRoutePanel aircraft={aircraft} />);

    expect(screen.getByText("EGLL to EGJJ")).toBeTruthy();
    expect(screen.getByText("EGLL CPT SAM EGJJ")).toBeTruthy();
    expect(screen.getByText("EGLL · CPT · SAM · EGJJ")).toBeTruthy();
  });
});

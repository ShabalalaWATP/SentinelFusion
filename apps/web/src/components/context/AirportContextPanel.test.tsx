import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, AirportContextResponse, AnalysisAreaResult } from "@aisstream/shared";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useMapStore } from "../../stores/mapStore";
import { AirportContextPanel } from "./AirportContextPanel";

const timestamp = "2026-06-21T11:00:00.000Z";
const area: AnalysisAreaResult = {
  id: "portsmouth",
  name: "Portsmouth",
  bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
  count: 0,
  listedCount: 0,
  highRiskCount: 0,
  militaryCount: 0,
  averageSpeedKn: 0,
  aircraftCount: 0,
  listedAircraftCount: 0,
  militaryAircraftCount: 0,
  emergencyAircraftCount: 0,
  averageAircraftAltitudeFt: 0,
  averageAircraftSpeedKt: 0,
  vessels: [],
  aircraft: []
};
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
const airportContext: AirportContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "OurAirports open airport data",
    url: "https://ourairports.com/data/",
    attribution: "Airport and runway open data by OurAirports"
  },
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  airports: [
    {
      id: "2538",
      ident: "EGHF",
      type: "small_airport",
      name: "Lee-on-Solent Airport",
      latitude: 50.815,
      longitude: -1.207,
      elevationFt: 32,
      isoCountry: "GB",
      municipality: "Lee-on-Solent",
      scheduledService: false,
      gpsCode: "EGHF",
      sourceUrl: "https://ourairports.com/airports/EGHF/",
      distanceKm: 0.6,
      bearingDegrees: 160,
      runways: [
        {
          id: "2",
          lengthFt: 3480,
          widthFt: 100,
          surface: "ASP",
          lighted: false,
          closed: false,
          lowEnd: { ident: "05", headingDegrees: 45 },
          highEnd: { ident: "23", headingDegrees: 225 }
        }
      ]
    }
  ],
  summary: {
    count: 1,
    scheduledServiceCount: 0,
    runwayCount: 1,
    nearestDistanceKm: 0.6,
    longestRunwayFt: 3480
  },
  limitations: ["OurAirports is public-domain community data."]
};

describe("AirportContextPanel", () => {
  beforeEach(() => {
    cleanup();
    useAirportContextStore.setState({
      areaStatus: "idle",
      areaResult: null,
      areaError: null,
      aircraftStatuses: {},
      aircraftResults: {},
      aircraftErrors: {},
      refreshArea: async () => undefined,
      refreshAircraft: async () => undefined
    });
    useMapStore.setState({
      intelligenceLayers: {
        airports: false,
        chokepoints: true,
        "fire-anomalies": false,
        "maritime-zones": false,
        ports: true,
        "risk-zones": true,
        "shipping-lanes": true
      }
    });
  });

  it("requests airport context for an analysed area", () => {
    const refreshArea = vi.fn(async () => undefined);
    useAirportContextStore.setState({ refreshArea });

    render(<AirportContextPanel area={area} />);

    expect(refreshArea).toHaveBeenCalledWith(area.bounds);
  });

  it("renders area airport and runway details and can enable the map layer", () => {
    useAirportContextStore.setState({
      areaStatus: "success",
      areaResult: airportContext
    });

    render(<AirportContextPanel area={area} />);

    expect(screen.getByText(/1 airports/i)).toBeTruthy();
    expect(screen.getByText(/EGHF/i)).toBeTruthy();
    expect(screen.getByText(/05\/23/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show airports on map/i }));
    expect(useMapStore.getState().intelligenceLayers.airports).toBe(true);
  });

  it("requests selected-aircraft context through the aircraft endpoint", () => {
    const refreshAircraft = vi.fn(async () => undefined);
    useAirportContextStore.setState({ refreshAircraft });

    render(<AirportContextPanel aircraft={aircraft} />);

    expect(refreshAircraft).toHaveBeenCalledWith(aircraft.id);
  });

  it("does not render cached airport context from a different area", () => {
    useAirportContextStore.setState({
      areaStatus: "success",
      areaResult: {
        ...airportContext,
        area: { south: 49.9, west: -1.28, north: 50.1, east: -0.86 }
      }
    });

    render(<AirportContextPanel area={area} />);

    expect(screen.getByText("Nearest airports and runways")).toBeTruthy();
    expect(screen.queryByText(/Lee-on-Solent/i)).toBeNull();
  });
});

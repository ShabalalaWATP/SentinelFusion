import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AirspaceContextResponse, AnalysisAreaResult } from "@aisstream/shared";
import { useAirspaceContextStore } from "../../stores/airspaceContextStore";
import { AirspaceContextPanel } from "./AirspaceContextPanel";

const timestamp = "2026-06-21T12:00:00.000Z";
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
const notConfiguredContext: AirspaceContextResponse = {
  status: "not_configured",
  mode: "off",
  source: {
    title: "Authorised NOTAM/TFR provider",
    url: "https://www.faa.gov/air_traffic/technology/swim",
    attribution: "Authorised provider required"
  },
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  notices: [],
  summary: {
    count: 0,
    activeCount: 0,
    upcomingCount: 0,
    highSeverityCount: 0
  },
  limitations: ["Live NOTAM/TFR access is not configured."],
  error: "Authorised airspace notice provider is not configured."
};
const mockContext: AirspaceContextResponse = {
  status: "ok",
  mode: "mock",
  source: notConfiguredContext.source,
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  notices: [
    {
      id: "mock-airspace-training-area",
      type: "restricted_area",
      status: "active",
      severity: "medium",
      title: "Mock restricted training area",
      description: "Mock notice.",
      startsAt: timestamp,
      bounds: area.bounds
    }
  ],
  summary: {
    count: 1,
    activeCount: 1,
    upcomingCount: 0,
    highSeverityCount: 0
  },
  limitations: ["Mock airspace notices are for offline development only."]
};

describe("AirspaceContextPanel", () => {
  beforeEach(() => {
    cleanup();
    useAirspaceContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
  });

  it("requests airspace context for an analysed area", () => {
    const refresh = vi.fn(async () => undefined);
    useAirspaceContextStore.setState({ refresh });

    render(<AirspaceContextPanel area={area} />);

    expect(refresh).toHaveBeenCalledWith(area.bounds);
  });

  it("renders provider-not-configured status in readable text", () => {
    useAirspaceContextStore.setState({
      status: "success",
      result: notConfiguredContext
    });

    render(<AirspaceContextPanel area={area} />);

    expect(screen.getByText("Provider not configured")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toggle airspace notices" }));
    expect(screen.getByText("Authorised airspace notice provider is not configured.")).toBeTruthy();
    expect(screen.queryByText("airspaceContext")).toBeNull();
  });

  it("renders mock notices only when provided by the store", () => {
    useAirspaceContextStore.setState({
      status: "success",
      result: mockContext
    });

    render(<AirspaceContextPanel area={area} />);

    expect(screen.getAllByText(/1 notices/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Mock restricted training area")).toBeTruthy();
  });
});

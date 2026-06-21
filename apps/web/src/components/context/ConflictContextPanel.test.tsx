import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisAreaResult, ConflictContextResponse } from "@aisstream/shared";
import { useConflictContextStore } from "../../stores/conflictContextStore";
import { useMapStore } from "../../stores/mapStore";
import { ConflictContextPanel } from "./ConflictContextPanel";

const timestamp = "2026-06-21T10:00:00.000Z";
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

const conflictContext: ConflictContextResponse = {
  status: "ok",
  mode: "live",
  provider: "acled",
  source: {
    title: "ACLED conflict and protest events",
    url: "https://acleddata.com/api-documentation/acled-endpoint",
    attribution: "Conflict and protest data by ACLED"
  },
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  lookbackDays: 14,
  events: [
    {
      id: "GBR12345",
      eventDate: "2026-06-20",
      eventType: "Protests",
      subEventType: "Peaceful protest",
      location: "Portsmouth",
      latitude: 50.8058,
      longitude: -1.0872,
      geoPrecision: 1,
      geocodingConfidence: "high",
      fatalities: 0,
      severity: "medium",
      sourceName: "Local media",
      notes: "Reported demonstration near the port area."
    }
  ],
  summary: {
    count: 1,
    protestCount: 1,
    riotCount: 0,
    politicalViolenceCount: 0,
    fatalityCount: 0,
    highSeverityCount: 0,
    latestEventDate: "2026-06-20"
  },
  risk: {
    level: "medium",
    reasons: ["One recent conflict or protest event was reported in this area."]
  },
  limitations: ["Conflict and protest events are based on reported sources."]
};

describe("ConflictContextPanel", () => {
  beforeEach(() => {
    cleanup();
    useConflictContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
    useMapStore.setState({
      intelligenceLayers: {
        airports: false,
        chokepoints: true,
        "conflict-events": false,
        "fire-anomalies": false,
        "maritime-zones": false,
        ports: true,
        "risk-zones": true,
        "shipping-lanes": true
      }
    });
  });

  it("requests conflict context for the analysed area", () => {
    const refresh = vi.fn(async () => undefined);
    useConflictContextStore.setState({ refresh });

    render(<ConflictContextPanel area={area} />);

    expect(refresh).toHaveBeenCalledWith(area.bounds);
  });

  it("renders events and can enable the map overlay", () => {
    useConflictContextStore.setState({
      status: "success",
      result: conflictContext
    });

    render(<ConflictContextPanel area={area} />);

    expect(screen.getByText(/1 reported events/i)).toBeTruthy();
    expect(screen.getByText("Peaceful protest")).toBeTruthy();
    expect(screen.getByText(/high location confidence/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show conflict events on map/i }));
    expect(useMapStore.getState().intelligenceLayers["conflict-events"]).toBe(true);
  });

  it("renders not-configured state without raw environment variable names", () => {
    useConflictContextStore.setState({
      status: "success",
      result: {
        ...conflictContext,
        status: "not_configured",
        events: [],
        summary: {
          count: 0,
          protestCount: 0,
          riotCount: 0,
          politicalViolenceCount: 0,
          fatalityCount: 0,
          highSeverityCount: 0
        },
        limitations: ["Set ACLED_ACCESS_TOKEN on the API server to enable live events."]
      }
    });

    render(<ConflictContextPanel area={area} />);
    fireEvent.click(screen.getByRole("button", { name: /provider not configured/i }));

    expect(screen.getByText(/live conflict and protest access is not configured/i)).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("ACLED_ACCESS_TOKEN");
  });

  it("renders provider error states distinctly from not-configured states", () => {
    useConflictContextStore.setState({
      status: "success",
      result: {
        ...conflictContext,
        status: "error",
        events: [],
        summary: {
          count: 0,
          protestCount: 0,
          riotCount: 0,
          politicalViolenceCount: 0,
          fatalityCount: 0,
          highSeverityCount: 0
        },
        limitations: ["Retry later or use mock mode for offline development."],
        error: "ACLED returned HTTP 503."
      }
    });

    render(<ConflictContextPanel area={area} />);
    fireEvent.click(screen.getByRole("button", { name: /acled returned http 503/i }));

    expect(screen.getAllByText("ACLED returned HTTP 503.")).toHaveLength(2);
    expect(screen.queryByText(/access is not configured/i)).toBeNull();
  });

  it("does not render cached events from a different area", () => {
    useConflictContextStore.setState({
      status: "success",
      result: {
        ...conflictContext,
        area: { south: 49.9, west: -1.28, north: 50.1, east: -0.86 }
      }
    });

    render(<ConflictContextPanel area={area} />);

    expect(screen.getByText("Live area context")).toBeTruthy();
    expect(screen.queryByText("Peaceful protest")).toBeNull();
  });
});

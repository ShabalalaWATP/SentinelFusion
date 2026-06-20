import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisAreaResult, FireContextResponse } from "@aisstream/shared";
import { useFireContextStore } from "../../stores/fireContextStore";
import { useMapStore } from "../../stores/mapStore";
import { FireContextPanel } from "./FireContextPanel";

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

const fireContext: FireContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "NASA FIRMS Active Fire",
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
  },
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  sourceDataset: "VIIRS_SNPP_NRT",
  dayRange: 1,
  detections: [
    {
      id: "det-1",
      latitude: 50.79,
      longitude: -1.04,
      acquiredAt: timestamp,
      confidence: "high",
      rawConfidence: "h",
      satellite: "N",
      instrument: "VIIRS",
      dayNight: "day",
      fireRadiativePowerMw: 55.1
    }
  ],
  summary: {
    count: 1,
    highConfidenceCount: 1,
    dayCount: 1,
    nightCount: 0,
    maxFireRadiativePowerMw: 55.1,
    latestAcquiredAt: timestamp
  },
  risk: {
    level: "high",
    reasons: ["One active fire detection may affect area operations."]
  },
  limitations: ["FIRMS active-fire points are satellite thermal detections."]
};

describe("FireContextPanel", () => {
  beforeEach(() => {
    cleanup();
    useFireContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
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

  it("requests fire context for the analysed area", () => {
    const refresh = vi.fn(async () => undefined);
    useFireContextStore.setState({ refresh });

    render(<FireContextPanel area={area} />);

    expect(refresh).toHaveBeenCalledWith(area.bounds);
  });

  it("renders detections and can enable the map overlay", () => {
    useFireContextStore.setState({
      status: "success",
      result: fireContext
    });

    render(<FireContextPanel area={area} />);

    expect(screen.getByText(/1 active fire detections/i)).toBeTruthy();
    expect(screen.getByText("high confidence")).toBeTruthy();
    expect(screen.getByText("55.1 MW")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show fire detections on map/i }));
    expect(useMapStore.getState().intelligenceLayers["fire-anomalies"]).toBe(true);
    expect(document.body.innerHTML).not.toContain("FIRMS_MAP_KEY");
  });

  it("renders provider not-configured state clearly", () => {
    useFireContextStore.setState({
      status: "success",
      result: {
        ...fireContext,
        status: "not_configured",
        detections: [],
        summary: {
          count: 0,
          highConfidenceCount: 0,
          dayCount: 0,
          nightCount: 0
        },
        limitations: ["Set FIRMS_MAP_KEY on the API server to enable live fire detections."]
      }
    });

    render(<FireContextPanel area={area} />);
    fireEvent.click(screen.getByRole("button", { name: /provider not configured/i }));

    expect(screen.getByText("Provider not configured")).toBeTruthy();
    expect(screen.getByText(/FIRMS_MAP_KEY/i)).toBeTruthy();
  });

  it("does not render cached detections from a different area", () => {
    useFireContextStore.setState({
      status: "success",
      result: {
        ...fireContext,
        area: { south: 49.9, west: -1.28, north: 50.1, east: -0.86 }
      }
    });

    render(<FireContextPanel area={area} />);

    expect(screen.getByText("Live area context")).toBeTruthy();
    expect(screen.queryByText("high confidence")).toBeNull();
  });
});

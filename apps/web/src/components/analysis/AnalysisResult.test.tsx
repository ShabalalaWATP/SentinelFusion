import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisSummary } from "@aisstream/shared";
import { useAirspaceContextStore } from "../../stores/airspaceContextStore";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useFireContextStore } from "../../stores/fireContextStore";
import { useMapStore } from "../../stores/mapStore";
import { useMarineWeatherStore } from "../../stores/marineWeatherStore";
import { AnalysisResult } from "./AnalysisResult";

const result: AnalysisSummary = {
  status: "ok",
  mode: "live",
  model: "gpt-5.4-mini",
  summary: "There are 43 vessels in Portsmouth.",
  riskLevel: "low",
  keyFindings: ["The selected area currently contains 43 tracked vessels."],
  recommendedActions: ["Monitor the single high-risk vessel."],
  evidence: ["The areaFocus vesselCount field should not be shown here."],
  limitations: ["AIS positions can change."],
  area: {
    id: "portsmouth",
    name: "Portsmouth",
    bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
    count: 43,
    listedCount: 2,
    highRiskCount: 1,
    militaryCount: 0,
    averageSpeedKn: 2.4,
    aircraftCount: 1,
    listedAircraftCount: 1,
    militaryAircraftCount: 1,
    emergencyAircraftCount: 0,
    averageAircraftAltitudeFt: 18000,
    averageAircraftSpeedKt: 310,
    vessels: [
      {
        id: "mmsi-235114986",
        mmsi: "235114986",
        name: "SOLENT FLYER",
        shipType: "Unspecified",
        longitude: -1.1559,
        latitude: 50.7391,
        speedOverGround: 24.8,
        courseOverGround: 32.4,
        riskLevel: "high",
        classification: "civilian"
      },
      {
        id: "mmsi-235065995",
        mmsi: "235065995",
        name: "ALBION",
        shipType: "Unspecified",
        longitude: -1.1088,
        latitude: 50.7956,
        speedOverGround: 0.1,
        courseOverGround: 41.1,
        riskLevel: "low",
        classification: "civilian"
      }
    ],
    aircraft: [
      {
        id: "icao24-43c6f1",
        icao24: "43c6f1",
        callsign: "RFR7182",
        aircraftType: "A400M",
        longitude: -1.16,
        latitude: 50.8,
        altitudeFt: 18000,
        groundSpeedKt: 310,
        riskLevel: "medium",
        classification: "military",
        emergency: false
      }
    ]
  },
  generatedAt: "2026-06-11T10:00:00.000Z"
};

describe("AnalysisResult", () => {
  beforeEach(() => {
    useMapStore.setState({ areaFocusRequest: null });
    useAirspaceContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
    useMarineWeatherStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
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
    useFireContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
  });

  it("renders area analysis as a readable vessel list and focuses the map area", () => {
    const onInspectVessel = vi.fn();
    render(<AnalysisResult result={result} onInspectVessel={onInspectVessel} />);
    const text = document.body.textContent ?? "";

    expect(text).toContain("Area result");
    expect(text).toContain("Portsmouth");
    expect(text).toContain("43");
    expect(text).toContain("Vessels in area");
    expect(text).toContain("Aircraft in area");
    expect(text).toContain("SOLENT FLYER");
    expect(text).toContain("ALBION");
    expect(text).toContain("RFR7182");
    expect(text).not.toContain("areaFocus");
    expect(text).not.toContain("vesselCount");
    expect(useMapStore.getState().areaFocusRequest).toMatchObject({
      id: "portsmouth",
      name: "Portsmouth"
    });
  });
});

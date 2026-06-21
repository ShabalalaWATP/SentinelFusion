import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AirportContextResponse, AnalysisSummary } from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useAirportContextData } from "./useAirportContextData";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T11:00:00.000Z";
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
  area: bounds,
  airports: [
    {
      id: "2538",
      ident: "EGHF",
      type: "small_airport",
      name: "Lee-on-Solent Airport",
      latitude: 50.815,
      longitude: -1.207,
      scheduledService: false,
      sourceUrl: "https://ourairports.com/airports/EGHF/",
      distanceKm: 0.6,
      bearingDegrees: 160,
      runways: []
    }
  ],
  summary: {
    count: 1,
    scheduledServiceCount: 0,
    runwayCount: 0
  },
  limitations: ["OurAirports is public-domain community data."]
};
const analysisResult: AnalysisSummary = {
  status: "ok",
  mode: "live",
  summary: "Area context.",
  riskLevel: "low",
  keyFindings: ["Finding."],
  recommendedActions: ["Action."],
  evidence: ["Evidence."],
  limitations: ["Limitation."],
  generatedAt: timestamp,
  area: {
    id: "portsmouth",
    name: "Portsmouth",
    bounds,
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
  }
};

describe("useAirportContextData", () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
    useAircraftStore.setState({ selectedAircraftId: null });
    useAirportContextStore.setState({
      areaStatus: "idle",
      areaResult: null,
      areaError: null,
      aircraftStatuses: {},
      aircraftResults: {},
      aircraftErrors: {}
    });
  });

  it("uses matching area airport context for map points", () => {
    useAnalysisStore.setState({ result: analysisResult });
    useAirportContextStore.setState({ areaResult: airportContext });

    const { result } = renderHook(() => useAirportContextData());

    expect(result.current.features).toHaveLength(1);
    expect(result.current.features[0]?.properties?.ident).toBe("EGHF");
  });

  it("does not use stale area airport context", () => {
    useAnalysisStore.setState({ result: analysisResult });
    useAirportContextStore.setState({
      areaResult: {
        ...airportContext,
        area: { south: 49.9, west: -1.28, north: 50.1, east: -0.86 }
      }
    });

    const { result } = renderHook(() => useAirportContextData());

    expect(result.current.features).toHaveLength(0);
  });

  it("prefers selected-aircraft airport context over area context", () => {
    const aircraftContext = { ...airportContext };
    delete aircraftContext.area;
    useAnalysisStore.setState({ result: analysisResult });
    useAircraftStore.setState({ selectedAircraftId: "icao24-407abc" });
    useAirportContextStore.setState({
      areaResult: airportContext,
      aircraftResults: {
        "icao24-407abc": {
          ...aircraftContext,
          focus: {
            aircraftId: "icao24-407abc",
            latitude: 51,
            longitude: -1
          },
          airports: [
            {
              ...airportContext.airports[0]!,
              id: "2537",
              ident: "EGHI",
              name: "Southampton Airport"
            }
          ]
        }
      }
    });

    const { result } = renderHook(() => useAirportContextData());

    expect(result.current.features).toHaveLength(1);
    expect(result.current.features[0]?.properties?.ident).toBe("EGHI");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalysisSummary, FireContextResponse } from "@aisstream/shared";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useFireContextStore } from "../../stores/fireContextStore";
import { useFireAnomalyData } from "./useFireAnomalyData";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T10:00:00.000Z";

describe("useFireAnomalyData", () => {
  it("only exposes FIRMS points for the current area analysis result", () => {
    useAnalysisStore.setState({ result: areaSummary(), status: "success" });
    useFireContextStore.setState({ result: fireContext(bounds), status: "success" });

    const { rerender } = render(<FeatureCount />);

    expect(screen.getByText("1")).toBeTruthy();

    useAnalysisStore.setState({ result: { ...areaSummary(), area: undefined } });
    rerender(<FeatureCount />);

    expect(screen.getByText("0")).toBeTruthy();

    useAnalysisStore.setState({ result: areaSummary() });
    useFireContextStore.setState({
      result: fireContext({ south: 49, west: -2, north: 50, east: -1 })
    });
    rerender(<FeatureCount />);

    expect(screen.getByText("0")).toBeTruthy();
  });
});

function FeatureCount() {
  const collection = useFireAnomalyData();

  return <span>{collection.features.length}</span>;
}

function areaSummary(): AnalysisSummary {
  return {
    status: "ok",
    mode: "live",
    summary: "Area summary",
    riskLevel: "low",
    keyFindings: ["Area finding."],
    recommendedActions: ["Monitor the area."],
    evidence: ["Area evidence."],
    limitations: ["Area limitation."],
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
}

function fireContext(area: typeof bounds): FireContextResponse {
  return {
    status: "ok",
    mode: "live",
    source: {
      title: "NASA FIRMS Active Fire",
      url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
      attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
    },
    generatedAt: timestamp,
    cached: false,
    area,
    sourceDataset: "VIIRS_SNPP_NRT",
    dayRange: 1,
    detections: [
      {
        id: "det-1",
        latitude: 50.79,
        longitude: -1.04,
        acquiredAt: timestamp,
        confidence: "high",
        dayNight: "day"
      }
    ],
    summary: {
      count: 1,
      highConfidenceCount: 1,
      dayCount: 1,
      nightCount: 0
    },
    risk: {
      level: "high",
      reasons: ["One detection."]
    },
    limitations: ["FIRMS active-fire points are satellite thermal detections."]
  };
}

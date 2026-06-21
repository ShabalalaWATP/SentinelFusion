import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalysisSummary, ConflictContextResponse } from "@aisstream/shared";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useConflictContextStore } from "../../stores/conflictContextStore";
import { useConflictContextData } from "./useConflictContextData";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T10:00:00.000Z";

describe("useConflictContextData", () => {
  it("only exposes conflict points for the current area analysis result", () => {
    useAnalysisStore.setState({ result: areaSummary(), status: "success" });
    useConflictContextStore.setState({ result: conflictContext(bounds), status: "success" });

    const { rerender } = render(<FeatureCount />);

    expect(screen.getByText("1")).toBeTruthy();

    useAnalysisStore.setState({ result: { ...areaSummary(), area: undefined } });
    rerender(<FeatureCount />);

    expect(screen.getByText("0")).toBeTruthy();

    useAnalysisStore.setState({ result: areaSummary() });
    useConflictContextStore.setState({
      result: conflictContext({ south: 49, west: -2, north: 50, east: -1 })
    });
    rerender(<FeatureCount />);

    expect(screen.getByText("0")).toBeTruthy();
  });
});

function FeatureCount() {
  const collection = useConflictContextData();

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

function conflictContext(area: typeof bounds): ConflictContextResponse {
  return {
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
    area,
    lookbackDays: 14,
    events: [
      {
        id: "GBR12345",
        eventDate: "2026-06-20",
        eventType: "Protests",
        location: "Portsmouth",
        latitude: 50.8058,
        longitude: -1.0872,
        geocodingConfidence: "high",
        fatalities: 0,
        severity: "medium"
      }
    ],
    summary: {
      count: 1,
      protestCount: 1,
      riotCount: 0,
      politicalViolenceCount: 0,
      fatalityCount: 0,
      highSeverityCount: 0
    },
    risk: {
      level: "medium",
      reasons: ["One event."]
    },
    limitations: ["Conflict and protest events are based on reported sources."]
  };
}

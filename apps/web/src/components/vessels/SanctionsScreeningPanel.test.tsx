import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SanctionsScreeningResponse, Vessel } from "@aisstream/shared";
import { useSanctionsScreeningStore } from "../../stores/sanctionsScreeningStore";
import { SanctionsScreeningPanel } from "./SanctionsScreeningPanel";

const timestamp = "2026-06-21T12:00:00.000Z";
const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  destination: "Felixstowe",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};
const notConfiguredContext: SanctionsScreeningResponse = {
  status: "not_configured",
  mode: "off",
  provider: "opensanctions",
  source: {
    title: "OpenSanctions API",
    url: "https://www.opensanctions.org/docs/api/",
    attribution: "Configured provider required"
  },
  generatedAt: timestamp,
  cached: false,
  subject: {
    vesselId: vessel.id,
    mmsi: vessel.mmsi,
    name: vessel.name,
    shipType: vessel.shipType
  },
  matches: [],
  summary: {
    matchCount: 0,
    reviewRequiredCount: 0
  },
  limitations: ["Sanctions and ownership screening is not configured."],
  error: "Sanctions screening provider is not configured."
};
const mockContext: SanctionsScreeningResponse = {
  status: "ok",
  mode: "mock",
  provider: "mock",
  source: {
    title: "Mock sanctions screening",
    url: "https://www.opensanctions.org/docs/api/",
    attribution: "Mock screening context for local development"
  },
  generatedAt: timestamp,
  cached: false,
  subject: notConfiguredContext.subject,
  matches: [
    {
      id: "mock-review-lead",
      caption: "Northern Light Shipping Ltd",
      schema: "Company",
      score: 0.72,
      risk: "medium",
      reviewStatus: "possible_match",
      topics: ["sanction"],
      datasets: ["mock-watchlist"],
      sourceUrl: "javascript:alert(1)",
      explanation: "Mock lead based on a similar vessel name. Human review is required."
    }
  ],
  summary: {
    matchCount: 1,
    reviewRequiredCount: 1,
    highestScore: 0.72
  },
  limitations: ["Screening results are triage leads and can be false positives."]
};

describe("SanctionsScreeningPanel", () => {
  beforeEach(() => {
    cleanup();
    useSanctionsScreeningStore.setState({
      statuses: {},
      results: {},
      errors: {},
      refresh: async () => undefined
    });
  });

  it("requests sanctions screening for the selected vessel", () => {
    const refresh = vi.fn(async () => undefined);
    useSanctionsScreeningStore.setState({ refresh });

    render(<SanctionsScreeningPanel vessel={vessel} />);

    expect(refresh).toHaveBeenCalledWith(vessel.id);
  });

  it("renders provider-not-configured status in readable text", () => {
    useSanctionsScreeningStore.setState({
      statuses: { [vessel.id]: "success" },
      results: { [vessel.id]: notConfiguredContext }
    });

    render(<SanctionsScreeningPanel vessel={vessel} />);

    expect(screen.getByText("Provider not configured")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toggle sanctions screening" }));
    expect(screen.getByText("Sanctions screening provider is not configured.")).toBeTruthy();
    expect(screen.queryByText("sanctionsContext")).toBeNull();
  });

  it("renders mock review leads as false-positive-prone leads", () => {
    useSanctionsScreeningStore.setState({
      statuses: { [vessel.id]: "success" },
      results: { [vessel.id]: mockContext }
    });

    render(<SanctionsScreeningPanel vessel={vessel} />);

    expect(screen.getByText("1 review leads")).toBeTruthy();
    expect(screen.getByText("Review leads only, false positives are possible.")).toBeTruthy();
    expect(screen.getByText("Northern Light Shipping Ltd")).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("javascript:");
  });
});

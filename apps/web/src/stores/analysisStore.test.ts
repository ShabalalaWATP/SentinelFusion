import { describe, expect, it } from "vitest";
import type { AnalysisSummary } from "@aisstream/shared";
import { useAnalysisStore } from "./analysisStore";

const summary: AnalysisSummary = {
  status: "ok",
  mode: "mock",
  model: "deterministic-local",
  summary: "No immediate high-risk indicators.",
  riskLevel: "low",
  keyFindings: ["One vessel is selected."],
  recommendedActions: ["Continue monitoring."],
  evidence: ["Server context contained one vessel."],
  limitations: ["AIS can be delayed."],
  generatedAt: "2026-06-11T10:00:00.000Z"
};

describe("analysisStore", () => {
  it("runs analysis requests and stores successful results", async () => {
    useAnalysisStore.getState().reset();

    await useAnalysisStore.getState().analyse(
      { question: "Assess current traffic", domain: "all" },
      {
        analyse: async () => summary
      }
    );

    const state = useAnalysisStore.getState();
    expect(state.status).toBe("success");
    expect(state.result?.summary).toBe(summary.summary);
    expect(state.error).toBeNull();
  });

  it("stores analysis request errors", async () => {
    useAnalysisStore.getState().reset();

    await useAnalysisStore.getState().analyse(
      { question: "Assess current traffic", domain: "all" },
      {
        analyse: async () => {
          throw new Error("request failed");
        }
      }
    );

    const state = useAnalysisStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("request failed");
  });

  it("clears stale results when a later analysis request fails", async () => {
    useAnalysisStore.getState().reset();

    await useAnalysisStore.getState().analyse(
      { question: "Assess current traffic", domain: "all" },
      {
        analyse: async () => summary
      }
    );

    await useAnalysisStore.getState().analyse(
      { question: "Assess another area", domain: "all" },
      {
        analyse: async () => {
          throw new Error("request failed");
        }
      }
    );

    const state = useAnalysisStore.getState();
    expect(state.status).toBe("error");
    expect(state.result).toBeNull();
    expect(state.error).toBe("request failed");
  });
});

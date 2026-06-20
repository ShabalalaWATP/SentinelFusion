import type { AnalysisRequest, AnalysisSummary } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

export type AnalysisStatus = "idle" | "loading" | "success" | "error";

export type AnalysisState = {
  question: string;
  status: AnalysisStatus;
  result: AnalysisSummary | null;
  error: string | null;
  clearResult(): void;
  setQuestion(question: string): void;
  analyse(request: AnalysisRequest, client?: Pick<ApiClient, "analyse">): Promise<void>;
  reset(): void;
};

const defaultQuestion = "How many vessels are in the Portsmouth area?";

export const useAnalysisStore = create<AnalysisState>((set) => ({
  question: defaultQuestion,
  status: "idle",
  result: null,
  error: null,
  clearResult: () => set({ status: "idle", result: null, error: null }),
  setQuestion: (question) => set({ question }),
  analyse: async (request, client = apiClient) => {
    set({ status: "loading", result: null, error: null });
    try {
      const result = await client.analyse(request);
      set({ status: "success", result });
    } catch (error) {
      set({
        status: "error",
        result: null,
        error: error instanceof Error ? error.message : "Analysis request failed"
      });
    }
  },
  reset: () =>
    set({
      question: defaultQuestion,
      status: "idle",
      result: null,
      error: null
    })
}));

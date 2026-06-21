import type { SanctionsScreeningResponse } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

export type SanctionsScreeningStatus = "idle" | "loading" | "success" | "error";

export type SanctionsScreeningState = {
  statuses: Record<string, SanctionsScreeningStatus>;
  results: Record<string, SanctionsScreeningResponse | undefined>;
  errors: Record<string, string | undefined>;
  refresh(vesselId: string, client?: Pick<ApiClient, "getSanctionsScreening">): Promise<void>;
  reset(): void;
};

const latestRequestIds = new Map<string, number>();

export const useSanctionsScreeningStore = create<SanctionsScreeningState>((set) => ({
  statuses: {},
  results: {},
  errors: {},
  refresh: async (vesselId, client = apiClient) => {
    const requestId = (latestRequestIds.get(vesselId) ?? 0) + 1;
    latestRequestIds.set(vesselId, requestId);
    set((state) => ({
      statuses: { ...state.statuses, [vesselId]: "loading" },
      errors: { ...state.errors, [vesselId]: undefined }
    }));

    try {
      const result = await client.getSanctionsScreening(vesselId);
      if (requestId !== latestRequestIds.get(vesselId)) {
        return;
      }

      set((state) => ({
        statuses: { ...state.statuses, [vesselId]: "success" },
        results: { ...state.results, [vesselId]: result },
        errors: { ...state.errors, [vesselId]: undefined }
      }));
    } catch (error) {
      if (requestId !== latestRequestIds.get(vesselId)) {
        return;
      }

      set((state) => ({
        statuses: { ...state.statuses, [vesselId]: "error" },
        errors: {
          ...state.errors,
          [vesselId]: error instanceof Error ? error.message : "Sanctions screening request failed"
        }
      }));
    }
  },
  reset: () => {
    latestRequestIds.clear();
    set({
      statuses: {},
      results: {},
      errors: {}
    });
  }
}));

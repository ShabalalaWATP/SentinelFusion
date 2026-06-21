import type { FiledRouteContextResponse } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

export type FiledRouteContextStatus = "idle" | "loading" | "success" | "error";

export type FiledRouteContextState = {
  statuses: Record<string, FiledRouteContextStatus>;
  results: Record<string, FiledRouteContextResponse | undefined>;
  errors: Record<string, string | undefined>;
  refresh(aircraftId: string, client?: Pick<ApiClient, "getAircraftFiledRoute">): Promise<void>;
  reset(): void;
};

const latestRequestIds = new Map<string, number>();

export const useFiledRouteContextStore = create<FiledRouteContextState>((set) => ({
  statuses: {},
  results: {},
  errors: {},
  refresh: async (aircraftId, client = apiClient) => {
    const requestId = (latestRequestIds.get(aircraftId) ?? 0) + 1;
    latestRequestIds.set(aircraftId, requestId);
    set((state) => ({
      statuses: { ...state.statuses, [aircraftId]: "loading" },
      errors: { ...state.errors, [aircraftId]: undefined }
    }));

    try {
      const result = await client.getAircraftFiledRoute(aircraftId);
      if (requestId !== latestRequestIds.get(aircraftId)) {
        return;
      }

      set((state) => ({
        statuses: { ...state.statuses, [aircraftId]: "success" },
        results: { ...state.results, [aircraftId]: result },
        errors: { ...state.errors, [aircraftId]: undefined }
      }));
    } catch (error) {
      if (requestId !== latestRequestIds.get(aircraftId)) {
        return;
      }

      set((state) => ({
        statuses: { ...state.statuses, [aircraftId]: "error" },
        errors: {
          ...state.errors,
          [aircraftId]: error instanceof Error ? error.message : "Filed route request failed"
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

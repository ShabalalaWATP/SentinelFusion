import type { AirspaceContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

export type AirspaceContextStatus = "idle" | "loading" | "success" | "error";

export type AirspaceContextState = {
  status: AirspaceContextStatus;
  result: AirspaceContextResponse | null;
  error: string | null;
  refresh(bounds: TrafficAreaBounds, client?: Pick<ApiClient, "getAirspaceContext">): Promise<void>;
  reset(): void;
};

let latestRequestId = 0;

export const useAirspaceContextStore = create<AirspaceContextState>((set) => ({
  status: "idle",
  result: null,
  error: null,
  refresh: async (bounds, client = apiClient) => {
    const requestId = latestRequestId + 1;
    latestRequestId = requestId;
    set({ status: "loading", result: null, error: null });

    try {
      const result = await client.getAirspaceContext(bounds);
      if (requestId !== latestRequestId) {
        return;
      }

      set({ status: "success", result, error: null });
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      set({
        status: "error",
        error: error instanceof Error ? error.message : "Airspace context request failed"
      });
    }
  },
  reset: () => {
    latestRequestId += 1;
    set({
      status: "idle",
      result: null,
      error: null
    });
  }
}));

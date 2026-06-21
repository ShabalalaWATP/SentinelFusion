import type { ConflictContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

type ConflictContextStatus = "idle" | "loading" | "success" | "error";

export type ConflictContextState = {
  status: ConflictContextStatus;
  result: ConflictContextResponse | null;
  error: string | null;
  refresh(bounds: TrafficAreaBounds, client?: Pick<ApiClient, "getConflictContext">): Promise<void>;
  reset(): void;
};

let latestRequestId = 0;

export const useConflictContextStore = create<ConflictContextState>((set) => ({
  status: "idle",
  result: null,
  error: null,
  refresh: async (bounds, client = apiClient) => {
    const requestId = latestRequestId + 1;
    latestRequestId = requestId;
    set({ status: "loading", result: null, error: null });

    try {
      const result = await client.getConflictContext(bounds);
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
        error: error instanceof Error ? error.message : "Conflict context request failed"
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

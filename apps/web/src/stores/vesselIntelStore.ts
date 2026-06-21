import type { VesselIntelResponse } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

type VesselIntelStatus = "idle" | "loading" | "success" | "error";

export type VesselIntelState = {
  activeVesselId: string | null;
  status: VesselIntelStatus;
  statuses: Record<string, VesselIntelStatus>;
  results: Record<string, VesselIntelResponse>;
  errors: Record<string, string>;
  error: string | null;
  research(
    vesselId: string,
    client?: Pick<ApiClient, "getVesselIntel">,
    options?: { silent?: boolean }
  ): Promise<void>;
  reset(): void;
};

export const useVesselIntelStore = create<VesselIntelState>((set, get) => ({
  activeVesselId: null,
  status: "idle",
  statuses: {},
  results: {},
  errors: {},
  error: null,
  research: async (vesselId, client = apiClient, options = {}) => {
    if (get().statuses[vesselId] === "loading") {
      return;
    }

    set((state) => ({
      ...(options.silent ? {} : { activeVesselId: vesselId, status: "loading", error: null }),
      statuses: {
        ...state.statuses,
        [vesselId]: "loading"
      },
      errors: withoutKey(state.errors, vesselId)
    }));

    try {
      const result = await client.getVesselIntel(vesselId);
      set((state) => ({
        results: {
          ...state.results,
          [vesselId]: result
        },
        statuses: {
          ...state.statuses,
          [vesselId]: "success"
        },
        ...(state.activeVesselId === vesselId
          ? {
              status: "success" as const,
              error: null
            }
          : {})
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Vessel web intel request failed";
      set((state) => ({
        ...(state.activeVesselId === vesselId && !options.silent
          ? {
              status: "error" as const,
              error: message
            }
          : {}),
        statuses: {
          ...state.statuses,
          [vesselId]: "error"
        },
        errors: {
          ...state.errors,
          [vesselId]: message
        }
      }));
    }
  },
  reset: () =>
    set({
      activeVesselId: null,
      status: "idle",
      statuses: {},
      results: {},
      errors: {},
      error: null
    })
}));

function withoutKey<T>(values: Record<string, T>, key: string): Record<string, T> {
  const next = { ...values };
  delete next[key];
  return next;
}

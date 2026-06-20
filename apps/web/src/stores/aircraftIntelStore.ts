import type { AircraftIntelResponse } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

export type AircraftIntelStatus = "idle" | "loading" | "success" | "error";

export type AircraftIntelState = {
  activeAircraftId: string | null;
  status: AircraftIntelStatus;
  statuses: Record<string, AircraftIntelStatus>;
  results: Record<string, AircraftIntelResponse>;
  errors: Record<string, string>;
  error: string | null;
  research(
    aircraftId: string,
    client?: Pick<ApiClient, "getAircraftIntel">,
    options?: { silent?: boolean }
  ): Promise<void>;
  reset(): void;
};

export const useAircraftIntelStore = create<AircraftIntelState>((set, get) => ({
  activeAircraftId: null,
  status: "idle",
  statuses: {},
  results: {},
  errors: {},
  error: null,
  research: async (aircraftId, client = apiClient, options = {}) => {
    if (get().statuses[aircraftId] === "loading") {
      return;
    }

    set((state) => ({
      ...(options.silent ? {} : { activeAircraftId: aircraftId, status: "loading", error: null }),
      statuses: {
        ...state.statuses,
        [aircraftId]: "loading"
      },
      errors: withoutKey(state.errors, aircraftId)
    }));

    try {
      const result = await client.getAircraftIntel(aircraftId);
      set((state) => ({
        results: {
          ...state.results,
          [aircraftId]: result
        },
        statuses: {
          ...state.statuses,
          [aircraftId]: "success"
        },
        ...(state.activeAircraftId === aircraftId
          ? {
              status: "success" as const,
              error: null
            }
          : {})
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Aircraft web intel request failed";
      set((state) => ({
        ...(state.activeAircraftId === aircraftId && !options.silent
          ? {
              status: "error" as const,
              error: message
            }
          : {}),
        statuses: {
          ...state.statuses,
          [aircraftId]: "error"
        },
        errors: {
          ...state.errors,
          [aircraftId]: message
        }
      }));
    }
  },
  reset: () =>
    set({
      activeAircraftId: null,
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

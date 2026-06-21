import type { AirportContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import { create } from "zustand";
import { apiClient, type ApiClient } from "../api/apiClient";

type AirportContextStatus = "idle" | "loading" | "success" | "error";

export type AirportContextState = {
  areaStatus: AirportContextStatus;
  areaResult: AirportContextResponse | null;
  areaError: string | null;
  aircraftStatuses: Record<string, AirportContextStatus>;
  aircraftResults: Record<string, AirportContextResponse | undefined>;
  aircraftErrors: Record<string, string | undefined>;
  refreshArea(bounds: TrafficAreaBounds, client?: Pick<ApiClient, "getAirportContext">): Promise<void>;
  refreshAircraft(aircraftId: string, client?: Pick<ApiClient, "getAircraftAirportContext">): Promise<void>;
  reset(): void;
};

let latestAreaRequestId = 0;
const latestAircraftRequestIds = new Map<string, number>();

export const useAirportContextStore = create<AirportContextState>((set) => ({
  areaStatus: "idle",
  areaResult: null,
  areaError: null,
  aircraftStatuses: {},
  aircraftResults: {},
  aircraftErrors: {},
  refreshArea: async (bounds, client = apiClient) => {
    const requestId = latestAreaRequestId + 1;
    latestAreaRequestId = requestId;
    set({ areaStatus: "loading", areaResult: null, areaError: null });

    try {
      const result = await client.getAirportContext(bounds);
      if (requestId !== latestAreaRequestId) {
        return;
      }

      set({ areaStatus: "success", areaResult: result, areaError: null });
    } catch (error) {
      if (requestId !== latestAreaRequestId) {
        return;
      }

      set({
        areaStatus: "error",
        areaError: error instanceof Error ? error.message : "Airport context request failed"
      });
    }
  },
  refreshAircraft: async (aircraftId, client = apiClient) => {
    const requestId = (latestAircraftRequestIds.get(aircraftId) ?? 0) + 1;
    latestAircraftRequestIds.set(aircraftId, requestId);
    set((state) => ({
      aircraftStatuses: { ...state.aircraftStatuses, [aircraftId]: "loading" },
      aircraftErrors: { ...state.aircraftErrors, [aircraftId]: undefined }
    }));

    try {
      const result = await client.getAircraftAirportContext(aircraftId);
      if (requestId !== latestAircraftRequestIds.get(aircraftId)) {
        return;
      }

      set((state) => ({
        aircraftStatuses: { ...state.aircraftStatuses, [aircraftId]: "success" },
        aircraftResults: { ...state.aircraftResults, [aircraftId]: result },
        aircraftErrors: { ...state.aircraftErrors, [aircraftId]: undefined }
      }));
    } catch (error) {
      if (requestId !== latestAircraftRequestIds.get(aircraftId)) {
        return;
      }

      set((state) => ({
        aircraftStatuses: { ...state.aircraftStatuses, [aircraftId]: "error" },
        aircraftErrors: {
          ...state.aircraftErrors,
          [aircraftId]: error instanceof Error ? error.message : "Airport context request failed"
        }
      }));
    }
  },
  reset: () => {
    latestAreaRequestId += 1;
    latestAircraftRequestIds.clear();
    set({
      areaStatus: "idle",
      areaResult: null,
      areaError: null,
      aircraftStatuses: {},
      aircraftResults: {},
      aircraftErrors: {}
    });
  }
}));

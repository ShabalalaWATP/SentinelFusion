import type {
  Aircraft,
  AircraftMetrics,
  AircraftStreamEnvelope,
  FlightStreamStatus
} from "@aisstream/shared";
import { create } from "zustand";
import type { ConnectionStatus } from "../realtime/realtimeClient";

type AircraftState = {
  aircraft: Record<string, Aircraft>;
  selectedAircraftId: string | null;
  metrics: AircraftMetrics | null;
  streamStatus: FlightStreamStatus | null;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  setSnapshot(
    aircraft: Aircraft[],
    metrics: AircraftMetrics,
    streamStatus?: FlightStreamStatus
  ): void;
  applyEnvelope(envelope: AircraftStreamEnvelope): void;
  selectAircraft(id: string | null): void;
  setConnectionStatus(status: ConnectionStatus): void;
  setError(message: string | null): void;
  setStreamStatus(status: FlightStreamStatus): void;
};

export const useAircraftStore = create<AircraftState>((set) => ({
  aircraft: {},
  selectedAircraftId: null,
  metrics: null,
  streamStatus: null,
  connectionStatus: "closed",
  lastError: null,
  setSnapshot: (aircraft, metrics, streamStatus) =>
    set({
      aircraft: Object.fromEntries(aircraft.map((item) => [item.id, item])),
      metrics,
      ...(streamStatus
        ? {
            streamStatus,
            lastError: statusError(streamStatus)
          }
        : {})
    }),
  applyEnvelope: (envelope) =>
    set((state) => {
      if (envelope.kind === "snapshot") {
        return {
          aircraft: Object.fromEntries(envelope.aircraft.map((item) => [item.id, item])),
          metrics: envelope.metrics
        };
      }

      if (envelope.kind === "metrics") {
        return { metrics: envelope.metrics };
      }

      if (envelope.kind === "batch") {
        return {
          aircraft: {
            ...state.aircraft,
            ...Object.fromEntries(envelope.aircraft.map((item) => [item.id, item]))
          },
          metrics: envelope.metrics
        };
      }

      return {
        aircraft: {
          ...state.aircraft,
          [envelope.aircraft.id]: envelope.aircraft
        },
        metrics: envelope.metrics
      };
    }),
  selectAircraft: (id) => set({ selectedAircraftId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (message) => set({ lastError: message }),
  setStreamStatus: (status) =>
    set({
      streamStatus: status,
      lastError: statusError(status)
    })
}));

export const selectAircraftList = (state: AircraftState): Aircraft[] =>
  Object.values(state.aircraft).sort((left, right) =>
    aircraftLabel(left).localeCompare(aircraftLabel(right))
  );

export const selectSelectedAircraft = (state: AircraftState): Aircraft | null =>
  state.selectedAircraftId ? state.aircraft[state.selectedAircraftId] ?? null : null;

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24;
}

function statusError(status: FlightStreamStatus): string | null {
  if (!status.connected || status.errors > 0) {
    return status.lastError ?? null;
  }

  return null;
}

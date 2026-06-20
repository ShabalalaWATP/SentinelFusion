import type {
  Vessel,
  AisStreamStatus,
  VesselMetrics,
  VesselStreamEnvelope
} from "@aisstream/shared";
import { create } from "zustand";
import type { ConnectionStatus } from "../realtime/realtimeClient";

type VesselState = {
  vessels: Record<string, Vessel>;
  selectedVesselId: string | null;
  metrics: VesselMetrics | null;
  streamStatus: AisStreamStatus | null;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  setSnapshot(vessels: Vessel[], metrics: VesselMetrics, streamStatus?: AisStreamStatus): void;
  applyEnvelope(envelope: VesselStreamEnvelope): void;
  selectVessel(id: string | null): void;
  setConnectionStatus(status: ConnectionStatus): void;
  setError(message: string | null): void;
  setStreamStatus(status: AisStreamStatus): void;
};

export const useVesselStore = create<VesselState>((set) => ({
  vessels: {},
  selectedVesselId: null,
  metrics: null,
  streamStatus: null,
  connectionStatus: "closed",
  lastError: null,
  setSnapshot: (vessels, metrics, streamStatus) =>
    set({
      vessels: Object.fromEntries(vessels.map((vessel) => [vessel.id, vessel])),
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
          vessels: Object.fromEntries(envelope.vessels.map((vessel) => [vessel.id, vessel])),
          metrics: envelope.metrics
        };
      }

      if (envelope.kind === "metrics") {
        return { metrics: envelope.metrics };
      }

      if (envelope.kind === "batch") {
        return {
          vessels: {
            ...state.vessels,
            ...Object.fromEntries(envelope.vessels.map((vessel) => [vessel.id, vessel]))
          },
          metrics: envelope.metrics
        };
      }

      return {
        vessels: {
          ...state.vessels,
          [envelope.vessel.id]: envelope.vessel
        },
        metrics: envelope.metrics
      };
    }),
  selectVessel: (id) => set({ selectedVesselId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (message) => set({ lastError: message }),
  setStreamStatus: (status) =>
    set({
      streamStatus: status,
      lastError: statusError(status)
    })
}));

export const selectVesselList = (state: VesselState): Vessel[] =>
  Object.values(state.vessels).sort((left, right) => left.name.localeCompare(right.name));

export const selectSelectedVessel = (state: VesselState): Vessel | null =>
  state.selectedVesselId ? state.vessels[state.selectedVesselId] ?? null : null;

function statusError(status: AisStreamStatus): string | null {
  if (!status.connected || status.errors > 0) {
    return status.lastError ?? null;
  }

  return null;
}

import { create } from "zustand";
import { readLocalJson, writeLocalJson } from "./localStore";

type AlertStoreState = {
  acknowledged: Record<string, string>;
  dismissed: Record<string, string>;
  acknowledge(id: string): void;
  dismiss(id: string): void;
  restore(id: string): void;
};

const acknowledgedKey = "aisstream.acknowledgedAlerts.v1";
const dismissedKey = "aisstream.dismissedAlerts.v1";

export const useAlertStore = create<AlertStoreState>((set) => ({
  acknowledged: readLocalJson<Record<string, string>>(acknowledgedKey, {}, isStringRecord),
  dismissed: readLocalJson<Record<string, string>>(dismissedKey, {}, isStringRecord),
  acknowledge: (id) =>
    set((state) => ({
      acknowledged: persistRecord(acknowledgedKey, {
        ...state.acknowledged,
        [id]: new Date().toISOString()
      })
    })),
  dismiss: (id) =>
    set((state) => ({
      dismissed: persistRecord(dismissedKey, {
        ...state.dismissed,
        [id]: new Date().toISOString()
      })
    })),
  restore: (id) =>
    set((state) => {
      const dismissed = { ...state.dismissed };
      const acknowledged = { ...state.acknowledged };
      delete dismissed[id];
      delete acknowledged[id];

      return {
        acknowledged: persistRecord(acknowledgedKey, acknowledged),
        dismissed: persistRecord(dismissedKey, dismissed)
      };
    })
}));

function persistRecord(key: string, value: Record<string, string>): Record<string, string> {
  writeLocalJson(key, value);
  return value;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

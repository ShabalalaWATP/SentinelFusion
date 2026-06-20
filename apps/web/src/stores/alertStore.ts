import { create } from "zustand";
import {
  defaultAlertPresetSettings,
  countEnabledAlertPresets,
  isAlertPresetSettings,
  type AlertPresetId,
  type AlertPresetSettings
} from "../alerts/alertPresets";
import { readLocalJson, writeLocalJson } from "./localStore";

type AlertStoreState = {
  acknowledged: Record<string, string>;
  dismissed: Record<string, string>;
  providerIncidents: ProviderIncidentState;
  presets: AlertPresetSettings;
  acknowledge(id: string): void;
  dismiss(id: string): void;
  resetPresets(): void;
  restore(id: string): void;
  setPreset(id: AlertPresetId, enabled: boolean): void;
  togglePreset(id: AlertPresetId): void;
  updateProviderIncident(domain: ProviderIncidentDomain, healthy: boolean, nowIso: string): string;
};

export type ProviderIncidentDomain = "vessel" | "aircraft";
export type ProviderIncidentRecord = {
  epoch: string;
  unhealthy: boolean;
};
export type ProviderIncidentState = Record<ProviderIncidentDomain, ProviderIncidentRecord>;

const acknowledgedKey = "aisstream.acknowledgedAlerts.v1";
const dismissedKey = "aisstream.dismissedAlerts.v1";
const presetsKey = "aisstream.alertPresets.v1";

const initialProviderIncidentState = (): ProviderIncidentState => {
  const epoch = new Date().toISOString();

  return {
    aircraft: { epoch, unhealthy: false },
    vessel: { epoch, unhealthy: false }
  };
};

export const useAlertStore = create<AlertStoreState>((set) => ({
  acknowledged: readLocalJson<Record<string, string>>(acknowledgedKey, {}, isStringRecord),
  dismissed: readLocalJson<Record<string, string>>(dismissedKey, {}, isStringRecord),
  providerIncidents: initialProviderIncidentState(),
  presets: readLocalJson(presetsKey, defaultAlertPresetSettings, isAlertPresetSettings),
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
  resetPresets: () =>
    set({
      presets: persistPresets(defaultAlertPresetSettings)
    }),
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
    }),
  setPreset: (id, enabled) =>
    set((state) => ({
      presets: persistPresets({
        ...state.presets,
        [id]: enabled
      })
    })),
  togglePreset: (id) =>
    set((state) => ({
      presets: persistPresets({
        ...state.presets,
        [id]: !state.presets[id]
      })
    })),
  updateProviderIncident: (domain, healthy, nowIso) => {
    let nextEpoch = "";

    set((state) => {
      const current = state.providerIncidents[domain];
      const unhealthy = !healthy;
      nextEpoch = healthy ? current.epoch : current.unhealthy ? current.epoch : nowIso;

      if (current.epoch === nextEpoch && current.unhealthy === unhealthy) {
        return state;
      }

      return {
        providerIncidents: {
          ...state.providerIncidents,
          [domain]: {
            epoch: nextEpoch,
            unhealthy
          }
        }
      };
    });

    return nextEpoch;
  }
}));

export const selectAlertPresets = (state: AlertStoreState): AlertPresetSettings => state.presets;

export const selectEnabledAlertPresetCount = (state: AlertStoreState): number =>
  countEnabledAlertPresets(state.presets);

export const selectProviderIncidents = (state: AlertStoreState): ProviderIncidentState =>
  state.providerIncidents;

function persistRecord(key: string, value: Record<string, string>): Record<string, string> {
  writeLocalJson(key, value);
  return value;
}

function persistPresets(value: AlertPresetSettings): AlertPresetSettings {
  writeLocalJson(presetsKey, value);
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

import { create } from "zustand";
import {
  defaultFeedConfidenceSettings,
  countActiveFeedConfidenceFilters,
  type FeedConfidenceSettings
} from "../traffic/feedConfidence";
import { readLocalJson, writeLocalJson } from "./localStore";

type FeedFilterState = {
  settings: FeedConfidenceSettings;
  resetSettings(): void;
  setSetting<K extends keyof FeedConfidenceSettings>(
    key: K,
    value: FeedConfidenceSettings[K]
  ): void;
};

const feedFilterKey = "aisstream.feedConfidence.v1";

export const useFeedFilterStore = create<FeedFilterState>((set) => ({
  settings: readLocalJson(feedFilterKey, defaultFeedConfidenceSettings, isFeedConfidenceSettings),
  resetSettings: () =>
    set({
      settings: persistSettings(defaultFeedConfidenceSettings)
    }),
  setSetting: (key, value) =>
    set((state) => ({
      settings: persistSettings({
        ...state.settings,
        [key]: value
      })
    }))
}));

export const selectFeedConfidenceSettings = (state: FeedFilterState): FeedConfidenceSettings =>
  state.settings;

export const selectActiveFeedFilterCount = (state: FeedFilterState): number =>
  countActiveFeedConfidenceFilters(state.settings);

function persistSettings(settings: FeedConfidenceSettings): FeedConfidenceSettings {
  writeLocalJson(feedFilterKey, settings);
  return settings;
}

function isFeedConfidenceSettings(value: unknown): value is FeedConfidenceSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.hideStaleContacts === "boolean" &&
    typeof candidate.hideUnhealthyFeeds === "boolean" &&
    typeof candidate.maxContactAgeMinutes === "number" &&
    candidate.maxContactAgeMinutes >= 1 &&
    candidate.maxContactAgeMinutes <= 240
  );
}

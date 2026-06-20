import type { AircraftClassification } from "@aisstream/shared";
import { create } from "zustand";
import {
  countActiveAircraftFilters,
  defaultAircraftFilterSettings,
  type AircraftFilterSettings
} from "../traffic/trafficFilters";

type AircraftFilterState = {
  filters: AircraftFilterSettings;
  resetFilters(): void;
  setFilter<K extends keyof AircraftFilterSettings>(
    key: K,
    value: AircraftFilterSettings[K]
  ): void;
  toggleClassification(classification: AircraftClassification): void;
};

export const useAircraftFilterStore = create<AircraftFilterState>((set) => ({
  filters: defaultAircraftFilterSettings,
  resetFilters: () => set({ filters: defaultAircraftFilterSettings }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value
      }
    })),
  toggleClassification: (classification) =>
    set((state) => {
      const classifications = state.filters.classifications.includes(classification)
        ? state.filters.classifications.filter((item) => item !== classification)
        : [...state.filters.classifications, classification];

      return {
        filters: {
          ...state.filters,
          classifications
        }
      };
    })
}));

export const selectAircraftFilters = (state: AircraftFilterState): AircraftFilterSettings =>
  state.filters;

export const selectActiveAircraftFilterCount = (state: AircraftFilterState): number =>
  countActiveAircraftFilters(state.filters);

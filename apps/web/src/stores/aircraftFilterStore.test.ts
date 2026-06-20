import { describe, expect, it } from "vitest";
import {
  selectActiveAircraftFilterCount,
  useAircraftFilterStore
} from "./aircraftFilterStore";

describe("aircraftFilterStore", () => {
  it("tracks active aircraft filters and can reset them", () => {
    useAircraftFilterStore.getState().resetFilters();

    useAircraftFilterStore.getState().setFilter("query", "RFR");
    useAircraftFilterStore.getState().toggleClassification("military");
    useAircraftFilterStore.getState().setFilter("minAltitudeFt", 5000);

    expect(selectActiveAircraftFilterCount(useAircraftFilterStore.getState())).toBe(3);

    useAircraftFilterStore.getState().resetFilters();

    expect(selectActiveAircraftFilterCount(useAircraftFilterStore.getState())).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import type { AircraftIntelResponse } from "@aisstream/shared";
import { useAircraftIntelStore } from "./aircraftIntelStore";

const intel: AircraftIntelResponse = {
  status: "ok",
  mode: "mock",
  model: "deterministic-local",
  aircraftId: "icao24-43c6f1",
  summary: "Aircraft intel completed.",
  facts: ["ICAO 43C6F1."],
  sources: [],
  limitations: ["Test service."],
  generatedAt: "2026-06-11T10:00:00.000Z"
};

describe("aircraftIntelStore", () => {
  it("runs aircraft intel requests and caches successful results", async () => {
    useAircraftIntelStore.getState().reset();

    await useAircraftIntelStore.getState().research("icao24-43c6f1", {
      getAircraftIntel: async () => intel
    });

    const state = useAircraftIntelStore.getState();
    expect(state.status).toBe("success");
    expect(state.results["icao24-43c6f1"]?.summary).toBe(intel.summary);
    expect(state.error).toBeNull();
  });

  it("stores aircraft intel request errors for the active aircraft", async () => {
    useAircraftIntelStore.getState().reset();

    await useAircraftIntelStore.getState().research("icao24-43c6f1", {
      getAircraftIntel: async () => {
        throw new Error("request failed");
      }
    });

    const state = useAircraftIntelStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("request failed");
  });
});

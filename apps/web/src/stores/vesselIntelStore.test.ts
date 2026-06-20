import { describe, expect, it } from "vitest";
import type { VesselIntelResponse } from "@aisstream/shared";
import { useVesselIntelStore } from "./vesselIntelStore";

const intel: VesselIntelResponse = {
  status: "ok",
  mode: "mock",
  model: "deterministic-local",
  vesselId: "mmsi-232001234",
  summary: "Vessel intel completed.",
  facts: ["MMSI 232001234."],
  sources: [],
  limitations: ["Test service."],
  generatedAt: "2026-06-11T10:00:00.000Z"
};

describe("vesselIntelStore", () => {
  it("runs vessel intel requests and caches successful results", async () => {
    useVesselIntelStore.getState().reset();

    await useVesselIntelStore.getState().research("mmsi-232001234", {
      getVesselIntel: async () => intel
    });

    const state = useVesselIntelStore.getState();
    expect(state.status).toBe("success");
    expect(state.results["mmsi-232001234"]?.summary).toBe(intel.summary);
    expect(state.error).toBeNull();
  });

  it("stores vessel intel request errors for the active vessel", async () => {
    useVesselIntelStore.getState().reset();

    await useVesselIntelStore.getState().research("mmsi-232001234", {
      getVesselIntel: async () => {
        throw new Error("request failed");
      }
    });

    const state = useVesselIntelStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("request failed");
  });
});

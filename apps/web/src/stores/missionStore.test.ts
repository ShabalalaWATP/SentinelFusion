import { beforeEach, describe, expect, it } from "vitest";
import { useMissionStore } from "./missionStore";

describe("missionStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useMissionStore.setState({
      draft: "Examine all vessels and aircraft in the vicinity of the Hormuz Strait",
      cadence: "daily",
      anomalyDetection: true,
      routines: [],
      lastError: null
    });
  });

  it("saves a natural-language daily mission routine against a known area", () => {
    const routine = useMissionStore
      .getState()
      .addRoutine("Examine all vessels and aircraft in the vicinity of the Hormuz Strait", {
        anomalyDetection: true,
        cadence: "daily"
      });

    expect(routine?.area.id).toBe("hormuz");
    expect(routine?.domain).toBe("all");
    expect(routine?.anomalyDetection).toBe(true);
    expect(useMissionStore.getState().routines[0]?.title).toContain("Strait of Hormuz");
    expect(window.localStorage.getItem("aisstream.missionRoutines.v1")).toContain("hormuz");
  });
});

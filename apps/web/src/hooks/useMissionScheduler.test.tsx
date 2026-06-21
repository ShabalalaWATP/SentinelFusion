import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnomalyStore } from "../stores/anomalyStore";
import type { MissionRoutine } from "../stores/missionStore";
import { useMissionStore } from "../stores/missionStore";
import { useTrafficRuleStore } from "../stores/trafficRuleStore";
import { useMissionScheduler } from "./useMissionScheduler";

const bounds = { south: 25.5, west: 55, north: 27, east: 57.5 };
const now = "2026-06-21T10:00:00.000Z";

describe("useMissionScheduler", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useAnomalyStore.setState({ areaMonitors: [], entityMonitors: [] });
    useTrafficRuleStore.setState({ rules: [], events: [], lastError: null });
    useMissionStore.setState({
      routines: [],
      lastError: null
    });
  });

  it("runs due routines, creates matching watch rules, adds anomaly monitors, and touches them", () => {
    useMissionStore.setState({
      routines: [
        routine({
          cadence: "daily",
          lastRunAt: "2026-06-19T10:00:00.000Z",
          anomalyDetection: true
        }),
        routine({
          id: "manual",
          cadence: "manual",
          anomalyDetection: true
        }),
        routine({
          id: "fresh",
          cadence: "daily",
          lastRunAt: "2026-06-21T09:30:00.000Z",
          anomalyDetection: true
        }),
        routine({
          id: "inactive",
          cadence: "weekly",
          active: false,
          anomalyDetection: true
        })
      ]
    });

    render(<MissionSchedulerHarness />);

    expect(useTrafficRuleStore.getState().rules.map((rule) => rule.id)).toEqual(["hormuz-all"]);
    expect(useAnomalyStore.getState().areaMonitors.map((monitor) => monitor.id)).toEqual([
      "hormuz"
    ]);
    expect(useMissionStore.getState().routines[0]?.lastRunAt).toBe(now);
    expect(useMissionStore.getState().routines[1]?.lastRunAt).toBeUndefined();
    expect(useMissionStore.getState().routines[2]?.lastRunAt).toBe(
      "2026-06-21T09:30:00.000Z"
    );
    expect(useMissionStore.getState().routines[3]?.lastRunAt).toBeUndefined();
  });

  it("runs due routines without anomaly monitors when disabled", () => {
    useMissionStore.setState({
      routines: [
        routine({
          id: "aircraft-only",
          query: "Track aircraft only across the Strait of Hormuz",
          cadence: "weekly",
          anomalyDetection: false
        })
      ]
    });

    render(<MissionSchedulerHarness />);

    expect(useTrafficRuleStore.getState().rules[0]?.domain).toBe("aircraft");
    expect(useAnomalyStore.getState().areaMonitors).toEqual([]);
  });
});

function MissionSchedulerHarness() {
  useMissionScheduler();

  return <div>scheduler</div>;
}

function routine(overrides: Partial<MissionRoutine> = {}): MissionRoutine {
  return {
    id: "due",
    title: "All traffic routine: Strait of Hormuz",
    query: "Track all activity across the Strait of Hormuz",
    cadence: "daily",
    domain: "all",
    area: {
      id: "hormuz",
      name: "Strait of Hormuz",
      category: "strait",
      aliases: [],
      bounds
    },
    anomalyDetection: true,
    active: true,
    createdAt: "2026-06-20T10:00:00.000Z",
    ...overrides
  };
}

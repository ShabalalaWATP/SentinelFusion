import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnomalyStore } from "./anomalyStore";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

describe("anomalyStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));
    useAnomalyStore.setState({
      areaMonitors: [],
      entityMonitors: []
    });
  });

  it("persists area monitors and replaces duplicate monitor IDs", () => {
    useAnomalyStore.getState().addAreaMonitor({
      id: "portsmouth",
      name: "Portsmouth",
      bounds
    });
    useAnomalyStore.getState().addAreaMonitor({
      id: "portsmouth",
      name: "Portsmouth Harbour",
      bounds: { ...bounds, east: -0.7 }
    });

    expect(useAnomalyStore.getState().areaMonitors).toEqual([
      {
        id: "portsmouth",
        name: "Portsmouth Harbour",
        bounds: { ...bounds, east: -0.7 },
        active: true,
        createdAt: "2026-06-21T10:00:00.000Z"
      }
    ]);
    expect(window.localStorage.getItem("aisstream.areaAnomalyMonitors.v1")).toContain(
      "Portsmouth Harbour"
    );

    useAnomalyStore.getState().toggleAreaMonitor("portsmouth");
    expect(useAnomalyStore.getState().areaMonitors[0]?.active).toBe(false);

    useAnomalyStore.getState().removeAreaMonitor("portsmouth");
    expect(useAnomalyStore.getState().areaMonitors).toEqual([]);
  });

  it("toggles entity monitors and reports active membership", () => {
    useAnomalyStore.getState().toggleEntityMonitor("vessel", "mmsi-232001234");

    expect(useAnomalyStore.getState().isEntityMonitored("vessel", "mmsi-232001234")).toBe(true);
    expect(window.localStorage.getItem("aisstream.entityAnomalyMonitors.v1")).toContain(
      "mmsi-232001234"
    );

    useAnomalyStore.getState().toggleEntityMonitor("vessel", "mmsi-232001234");

    expect(useAnomalyStore.getState().isEntityMonitored("vessel", "mmsi-232001234")).toBe(false);
  });
});

import { act, cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useAircraftStore } from "../stores/aircraftStore";
import { useTrafficRuleStore } from "../stores/trafficRuleStore";
import { useVesselStore } from "../stores/vesselStore";
import { useTrafficWatchRules } from "./useTrafficWatchRules";

const timestamp = "2026-06-21T10:00:00.000Z";
const bounds = { south: 50.6, west: -1.4, north: 51, east: -0.8 };

describe("useTrafficWatchRules", () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    useVesselStore.setState({
      vessels: { [vessel.id]: vessel },
      selectedVesselId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useAircraftStore.setState({
      aircraft: { [aircraft.id]: aircraft },
      selectedAircraftId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });
    useTrafficRuleStore.setState({
      rules: [
        {
          id: "portsmouth-all",
          query: "track all traffic around Portsmouth",
          label: "All traffic in Portsmouth",
          domain: "all",
          area: {
            id: "portsmouth",
            name: "Portsmouth",
            category: "port",
            aliases: [],
            bounds
          },
          areaOnly: false,
          active: true,
          createdAt: timestamp
        }
      ],
      events: [],
      lastError: null
    });
  });

  it("records entered and left events for active area rules", () => {
    render(<TrafficWatchHarness />);

    expect(useTrafficRuleStore.getState().events).toEqual([]);

    act(() => {
      useVesselStore.setState({
        vessels: {
          [vessel.id]: {
            ...vessel,
            latitude: 52,
            longitude: 0
          }
        }
      });
      useAircraftStore.setState({
        aircraft: {
          [aircraft.id]: {
            ...aircraft,
            latitude: 52,
            longitude: 0
          }
        }
      });
    });

    expect(useTrafficRuleStore.getState().events.slice(0, 2).map((event) => event.eventType)).toEqual([
      "left",
      "left"
    ]);

    act(() => {
      useVesselStore.setState({
        vessels: { [vessel.id]: vessel }
      });
      useAircraftStore.setState({
        aircraft: { [aircraft.id]: aircraft }
      });
    });

    expect(useTrafficRuleStore.getState().events.slice(0, 2).map((event) => event.eventType)).toEqual([
      "entered",
      "entered"
    ]);
  });

  it("does not record events for inactive rules", () => {
    useTrafficRuleStore.setState({
      rules: useTrafficRuleStore.getState().rules.map((rule) => ({ ...rule, active: false })),
      events: []
    });

    render(<TrafficWatchHarness />);

    expect(useTrafficRuleStore.getState().events).toEqual([]);
  });
});

function TrafficWatchHarness() {
  useTrafficWatchRules();

  return <div>watch rules</div>;
}

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: -1.1,
  latitude: 50.8,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: -1.1, latitude: 50.8, timestamp }]
};

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  longitude: -1.05,
  latitude: 50.75,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "opensky",
  lastUpdated: timestamp,
  track: [{ longitude: -1.05, latitude: 50.75, altitudeFt: 18000, timestamp }]
};

import { describe, expect, it } from "vitest";
import type { AisStreamStatus, Vessel, VesselMetrics } from "@aisstream/shared";
import {
  selectSelectedVessel,
  selectVesselList,
  useVesselStore
} from "./vesselStore";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  destination: "Felixstowe",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};

const metrics: VesselMetrics = {
  liveVessels: 1,
  trackedVessels: 1,
  highRiskVessels: 0,
  averageSpeed: 12.5,
  dataLatencyMs: 100,
  lastUpdated: timestamp
};

const streamStatus: AisStreamStatus = {
  mode: "live",
  state: "subscribed",
  connected: true,
  messagesReceived: 1,
  messagesNormalised: 1,
  messagesDropped: 0,
  errors: 0,
  reconnectAttempts: 0,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]],
    filtersShipMMSI: [],
    filterMessageTypes: ["PositionReport"]
  }
};

describe("vesselStore", () => {
  it("applies snapshots and selected vessel state", () => {
    useVesselStore.setState({
      vessels: {},
      selectedVesselId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });

    useVesselStore.getState().setSnapshot([vessel], metrics, streamStatus);
    useVesselStore.getState().selectVessel(vessel.id);

    const state = useVesselStore.getState();
    expect(selectVesselList(state)).toHaveLength(1);
    expect(selectSelectedVessel(state)?.name).toBe("NORTHERN LIGHT");
    expect(state.metrics?.liveVessels).toBe(1);
    expect(state.streamStatus?.mode).toBe("live");
    expect(state.lastError).toBeNull();
  });

  it("merges batched vessel updates in one state update", () => {
    useVesselStore.setState({
      vessels: {},
      selectedVesselId: null,
      metrics: null,
      streamStatus: null,
      connectionStatus: "closed",
      lastError: null
    });

    const nextVessel: Vessel = {
      ...vessel,
      id: "mmsi-232001245",
      mmsi: "232001245",
      name: "CELTIC ROUTE"
    };

    useVesselStore.getState().applyEnvelope({
      kind: "batch",
      vessels: [vessel, nextVessel],
      metrics: {
        ...metrics,
        liveVessels: 2,
        trackedVessels: 2
      },
      sentAt: timestamp
    });

    const state = useVesselStore.getState();
    expect(selectVesselList(state)).toHaveLength(2);
    expect(state.metrics?.trackedVessels).toBe(2);
  });
});

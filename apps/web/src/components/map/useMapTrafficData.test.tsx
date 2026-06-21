import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { useVesselStore } from "../../stores/vesselStore";
import { useMapTrafficData } from "./useMapTrafficData";

const timestamp = "2026-06-21T10:00:00.000Z";
const bounds = { south: 50.6, west: -1.4, north: 51, east: -0.8 };

describe("useMapTrafficData", () => {
  beforeEach(() => {
    cleanup();
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
    useMapStore.setState({
      domainFilter: "all",
      areaOnlyMode: false,
      areaSelection: null
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
      events: []
    });
  });

  it("builds visible point data and only adds tracks for selected traffic or route mode", () => {
    const { rerender } = render(<TrafficDataProbe showRoutes={false} />);

    expect(readProbe()).toEqual({
      aircraftPoints: 1,
      aircraftTrackMarkers: 0,
      aircraftTracks: 0,
      vesselPoints: 1,
      vesselTrackMarkers: 0,
      vesselTracks: 0
    });

    useVesselStore.setState({ selectedVesselId: vessel.id });
    useAircraftStore.setState({ selectedAircraftId: aircraft.id });
    rerender(<TrafficDataProbe showRoutes={false} />);

    expect(readProbe()).toEqual({
      aircraftPoints: 1,
      aircraftTrackMarkers: 2,
      aircraftTracks: 1,
      vesselPoints: 1,
      vesselTrackMarkers: 2,
      vesselTracks: 1
    });

    useVesselStore.setState({ selectedVesselId: null });
    useAircraftStore.setState({ selectedAircraftId: null });
    rerender(<TrafficDataProbe showRoutes={true} />);

    expect(readProbe()).toEqual({
      aircraftPoints: 1,
      aircraftTrackMarkers: 2,
      aircraftTracks: 1,
      vesselPoints: 1,
      vesselTrackMarkers: 2,
      vesselTracks: 1
    });
  });
});

function TrafficDataProbe({ showRoutes }: { showRoutes: boolean }) {
  const data = useMapTrafficData(showRoutes);

  return (
    <pre data-testid="probe">
      {JSON.stringify({
        aircraftPoints: data.aircraftPointData.features.length,
        aircraftTrackMarkers: data.aircraftTrackMarkerData.features.length,
        aircraftTracks: data.aircraftTrackData.features.length,
        vesselPoints: data.pointData.features.length,
        vesselTrackMarkers: data.trackMarkerData.features.length,
        vesselTracks: data.trackData.features.length
      })}
    </pre>
  );
}

function readProbe(): Record<string, number> {
  return JSON.parse(screen.getByTestId("probe").textContent ?? "{}") as Record<string, number>;
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
  destination: "Portsmouth",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [
    { longitude: -1.2, latitude: 50.7, timestamp },
    { longitude: -1.1, latitude: 50.8, timestamp }
  ]
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
  track: [
    { longitude: -1.15, latitude: 50.72, altitudeFt: 17500, timestamp },
    { longitude: -1.05, latitude: 50.75, altitudeFt: 18000, timestamp }
  ]
};

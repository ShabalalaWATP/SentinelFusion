import { describe, expect, it } from "vitest";
import type { Aircraft, AirportContextResponse } from "@aisstream/shared";
import { useAirportContextStore } from "./airportContextStore";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T11:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-407abc",
  icao24: "407abc",
  callsign: "RFR7182",
  classification: "military",
  emergency: false,
  latitude: 50.82,
  longitude: -1.21,
  lastUpdated: timestamp,
  onGround: false,
  originCountry: "United Kingdom",
  riskLevel: "medium",
  source: "mock",
  track: []
};
const airportContext: AirportContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "OurAirports open airport data",
    url: "https://ourairports.com/data/",
    attribution: "Airport and runway open data by OurAirports"
  },
  generatedAt: timestamp,
  cached: false,
  area: bounds,
  airports: [],
  summary: {
    count: 0,
    scheduledServiceCount: 0,
    runwayCount: 0
  },
  limitations: ["OurAirports is public-domain community data."]
};

describe("airportContextStore", () => {
  it("loads area airport context", async () => {
    useAirportContextStore.getState().reset();

    await useAirportContextStore.getState().refreshArea(bounds, {
      getAirportContext: async () => airportContext
    });

    expect(useAirportContextStore.getState()).toMatchObject({
      areaStatus: "success",
      areaResult: airportContext,
      areaError: null
    });
  });

  it("loads selected-aircraft airport context by id", async () => {
    useAirportContextStore.getState().reset();
    const contextWithoutArea = { ...airportContext };
    delete contextWithoutArea.area;
    const aircraftContext: AirportContextResponse = {
      ...contextWithoutArea,
      focus: { latitude: aircraft.latitude, longitude: aircraft.longitude, aircraftId: aircraft.id }
    };

    await useAirportContextStore.getState().refreshAircraft(aircraft.id, {
      getAircraftAirportContext: async (aircraftId) => {
        expect(aircraftId).toBe(aircraft.id);
        return aircraftContext;
      }
    });

    const state = useAirportContextStore.getState();
    expect(state.aircraftStatuses[aircraft.id]).toBe("success");
    expect(state.aircraftResults[aircraft.id]?.focus?.aircraftId).toBe(aircraft.id);
  });

  it("captures area transport errors", async () => {
    useAirportContextStore.getState().reset();

    await useAirportContextStore.getState().refreshArea(bounds, {
      getAirportContext: async () => {
        throw new Error("failed");
      }
    });

    expect(useAirportContextStore.getState()).toMatchObject({
      areaStatus: "error",
      areaError: "failed"
    });
  });

  it("ignores stale area responses after a newer area request starts", async () => {
    useAirportContextStore.getState().reset();
    const first = deferred<AirportContextResponse>();
    const second = deferred<AirportContextResponse>();
    const alternateBounds = { south: 49.9, west: -1.3, north: 50.1, east: -0.8 };
    const alternateContext: AirportContextResponse = {
      ...airportContext,
      area: alternateBounds,
      summary: { ...airportContext.summary, count: 2 }
    };

    const firstRequest = useAirportContextStore.getState().refreshArea(bounds, {
      getAirportContext: async () => first.promise
    });
    const secondRequest = useAirportContextStore.getState().refreshArea(alternateBounds, {
      getAirportContext: async () => second.promise
    });
    second.resolve(alternateContext);
    await secondRequest;

    expect(useAirportContextStore.getState().areaResult?.area).toEqual(alternateBounds);

    first.resolve(airportContext);
    await firstRequest;
    expect(useAirportContextStore.getState().areaResult?.area).toEqual(alternateBounds);
    expect(useAirportContextStore.getState().areaResult?.summary.count).toBe(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

import { describe, expect, it } from "vitest";
import type { FiledRouteContextResponse } from "@aisstream/shared";
import { useFiledRouteContextStore } from "./filedRouteContextStore";

const aircraftId = "icao24-407abc";
const filedRouteContext: FiledRouteContextResponse = {
  status: "not_configured",
  mode: "off",
  provider: "flightaware",
  source: {
    title: "FlightAware AeroAPI",
    url: "https://www.flightaware.com/aeroapi/portal/documentation",
    attribution: "Licensed provider required"
  },
  generatedAt: "2026-06-21T12:00:00.000Z",
  cached: false,
  aircraft: {
    aircraftId,
    icao24: "407abc",
    callsign: "RFR7182"
  },
  limitations: ["Provider not configured."],
  error: "Licensed filed-route provider is not configured."
};

describe("filedRouteContextStore", () => {
  it("loads selected-aircraft filed route context", async () => {
    useFiledRouteContextStore.getState().reset();

    await useFiledRouteContextStore.getState().refresh(aircraftId, {
      getAircraftFiledRoute: async () => filedRouteContext
    });

    const state = useFiledRouteContextStore.getState();
    expect(state.statuses[aircraftId]).toBe("success");
    expect(state.results[aircraftId]?.status).toBe("not_configured");
  });

  it("does not let stale responses overwrite the latest aircraft result", async () => {
    useFiledRouteContextStore.getState().reset();
    let resolveFirst: ((value: FiledRouteContextResponse) => void) | undefined;
    const first = new Promise<FiledRouteContextResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const second = {
      ...filedRouteContext,
      provider: "fr24" as const
    };
    const firstRefresh = useFiledRouteContextStore.getState().refresh(aircraftId, {
      getAircraftFiledRoute: (() => first) as () => Promise<FiledRouteContextResponse>
    });

    await useFiledRouteContextStore.getState().refresh(aircraftId, {
      getAircraftFiledRoute: async () => second
    });
    resolveFirst?.(filedRouteContext);
    await firstRefresh;

    expect(useFiledRouteContextStore.getState().results[aircraftId]?.provider).toBe("fr24");
  });

  it("captures request errors", async () => {
    useFiledRouteContextStore.getState().reset();

    await useFiledRouteContextStore.getState().refresh(aircraftId, {
      getAircraftFiledRoute: async () => {
        throw new Error("offline");
      }
    });

    const state = useFiledRouteContextStore.getState();
    expect(state.statuses[aircraftId]).toBe("error");
    expect(state.errors[aircraftId]).toBe("offline");
  });
});

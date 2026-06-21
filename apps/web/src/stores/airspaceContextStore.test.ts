import { describe, expect, it } from "vitest";
import type { AirspaceContextResponse } from "@aisstream/shared";
import { useAirspaceContextStore } from "./airspaceContextStore";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const airspaceContext: AirspaceContextResponse = {
  status: "not_configured",
  mode: "off",
  source: {
    title: "Authorised NOTAM/TFR provider",
    url: "https://www.faa.gov/air_traffic/technology/swim",
    attribution: "Authorised provider required"
  },
  generatedAt: "2026-06-21T12:00:00.000Z",
  cached: false,
  area: bounds,
  notices: [],
  summary: {
    count: 0,
    activeCount: 0,
    upcomingCount: 0,
    highSeverityCount: 0
  },
  limitations: ["Provider not configured."],
  error: "Authorised airspace notice provider is not configured."
};

describe("airspaceContextStore", () => {
  it("loads area airspace context", async () => {
    useAirspaceContextStore.getState().reset();

    await useAirspaceContextStore.getState().refresh(bounds, {
      getAirspaceContext: async () => airspaceContext
    });

    const state = useAirspaceContextStore.getState();
    expect(state.status).toBe("success");
    expect(state.result?.status).toBe("not_configured");
  });

  it("does not let stale area responses overwrite the latest result", async () => {
    useAirspaceContextStore.getState().reset();
    let resolveFirst: ((value: AirspaceContextResponse) => void) | undefined;
    const first = new Promise<AirspaceContextResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const second = {
      ...airspaceContext,
      summary: { ...airspaceContext.summary, count: 2 }
    };
    const client = {
      getAirspaceContext: (() => first) as () => Promise<AirspaceContextResponse>
    };

    const firstRefresh = useAirspaceContextStore.getState().refresh(bounds, client);
    await useAirspaceContextStore.getState().refresh(bounds, {
      getAirspaceContext: async () => second
    });
    resolveFirst?.(airspaceContext);
    await firstRefresh;

    expect(useAirspaceContextStore.getState().result?.summary.count).toBe(2);
  });

  it("captures request errors", async () => {
    useAirspaceContextStore.getState().reset();

    await useAirspaceContextStore.getState().refresh(bounds, {
      getAirspaceContext: async () => {
        throw new Error("offline");
      }
    });

    const state = useAirspaceContextStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("offline");
  });
});

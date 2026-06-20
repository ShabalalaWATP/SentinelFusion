import { describe, expect, it } from "vitest";
import type { FireContextResponse } from "@aisstream/shared";
import { useFireContextStore } from "./fireContextStore";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T10:00:00.000Z";

const fireContext: FireContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "NASA FIRMS Active Fire",
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
  },
  generatedAt: timestamp,
  cached: false,
  area: bounds,
  sourceDataset: "VIIRS_SNPP_NRT",
  dayRange: 1,
  detections: [],
  summary: {
    count: 0,
    highConfidenceCount: 0,
    dayCount: 0,
    nightCount: 0
  },
  risk: {
    level: "low",
    reasons: ["No active fire detections were returned for this area."]
  },
  limitations: ["FIRMS active-fire points are satellite thermal detections."]
};

describe("fireContextStore", () => {
  it("loads fire context", async () => {
    useFireContextStore.getState().reset();

    await useFireContextStore.getState().refresh(bounds, {
      getFireContext: async () => fireContext
    });

    expect(useFireContextStore.getState()).toMatchObject({
      status: "success",
      result: fireContext,
      error: null
    });
  });

  it("keeps not-configured provider states as successful API results", async () => {
    useFireContextStore.getState().reset();
    const notConfigured: FireContextResponse = {
      ...fireContext,
      status: "not_configured",
      detections: [],
      limitations: ["Set FIRMS_MAP_KEY on the API server to enable live fire detections."]
    };

    await useFireContextStore.getState().refresh(bounds, {
      getFireContext: async () => notConfigured
    });

    expect(useFireContextStore.getState().status).toBe("success");
    expect(useFireContextStore.getState().result?.status).toBe("not_configured");
  });

  it("captures transport errors", async () => {
    useFireContextStore.getState().reset();

    await useFireContextStore.getState().refresh(bounds, {
      getFireContext: async () => {
        throw new Error("failed");
      }
    });

    expect(useFireContextStore.getState()).toMatchObject({
      status: "error",
      error: "failed"
    });
  });

  it("ignores older refresh responses after a newer area request starts", async () => {
    useFireContextStore.getState().reset();
    const first = deferred<FireContextResponse>();
    const second = deferred<FireContextResponse>();
    const alternateBounds = { south: 49.9, west: -1.3, north: 50.1, east: -0.8 };
    const alternateContext: FireContextResponse = {
      ...fireContext,
      area: alternateBounds,
      summary: { ...fireContext.summary, count: 2 }
    };

    const firstRequest = useFireContextStore.getState().refresh(bounds, {
      getFireContext: async () => first.promise
    });
    const secondRequest = useFireContextStore.getState().refresh(alternateBounds, {
      getFireContext: async () => second.promise
    });
    second.resolve(alternateContext);
    await secondRequest;

    expect(useFireContextStore.getState().result?.area).toEqual(alternateBounds);

    first.resolve(fireContext);
    await firstRequest;
    expect(useFireContextStore.getState().result?.area).toEqual(alternateBounds);
    expect(useFireContextStore.getState().result?.summary.count).toBe(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

import { describe, expect, it } from "vitest";
import type { SatelliteContextResponse } from "@aisstream/shared";
import { useSatelliteContextStore } from "./satelliteContextStore";

const timestamp = "2026-06-21T12:00:00.000Z";
const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

const snapshotContext: SatelliteContextResponse = {
  status: "ok",
  mode: "live",
  provider: "nasa-gibs",
  source: {
    title: "NASA GIBS imagery",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    attribution: "Satellite imagery by NASA Global Imagery Browse Services"
  },
  generatedAt: timestamp,
  cached: false,
  area: bounds,
  snapshot: {
    id: "snapshot-1",
    title: "VIIRS SNPP corrected reflectance true colour",
    layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    imageUrl: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
    acquiredDate: "2026-06-20",
    format: "image/jpeg",
    width: 512,
    height: 512,
    projection: "EPSG:4326",
    area: bounds
  },
  limitations: ["GIBS browse imagery is contextual."]
};

describe("satelliteContextStore", () => {
  it("loads satellite snapshot context", async () => {
    useSatelliteContextStore.getState().reset();

    await useSatelliteContextStore.getState().refresh(bounds, {
      getSatelliteContext: async () => snapshotContext
    });

    expect(useSatelliteContextStore.getState()).toMatchObject({
      status: "success",
      error: null,
      result: {
        status: "ok",
        provider: "nasa-gibs"
      }
    });
  });

  it("ignores older refresh responses after a newer area request starts", async () => {
    useSatelliteContextStore.getState().reset();
    const first = deferred<SatelliteContextResponse>();
    const second = deferred<SatelliteContextResponse>();
    const alternateBounds = { south: 50.7, west: -1.3, north: 50.88, east: -0.84 };
    const alternateSnapshot: SatelliteContextResponse = {
      ...snapshotContext,
      area: alternateBounds,
      snapshot: {
        ...snapshotContext.snapshot!,
        area: alternateBounds,
        acquiredDate: "2026-06-19"
      }
    };

    const firstRequest = useSatelliteContextStore.getState().refresh(bounds, {
      getSatelliteContext: async () => first.promise
    });
    const secondRequest = useSatelliteContextStore.getState().refresh(alternateBounds, {
      getSatelliteContext: async () => second.promise
    });

    second.resolve(alternateSnapshot);
    await secondRequest;
    expect(useSatelliteContextStore.getState().result?.area).toEqual(alternateBounds);

    first.resolve(snapshotContext);
    await firstRequest;
    expect(useSatelliteContextStore.getState().result?.snapshot?.acquiredDate).toBe("2026-06-19");
  });

  it("stores transport errors separately from provider states", async () => {
    useSatelliteContextStore.getState().reset();

    await useSatelliteContextStore.getState().refresh(bounds, {
      getSatelliteContext: async () => {
        throw new Error("request failed");
      }
    });

    expect(useSatelliteContextStore.getState()).toMatchObject({
      status: "error",
      error: "request failed"
    });
  });

  it("stores typed provider error responses as successful context results", async () => {
    useSatelliteContextStore.getState().reset();
    const providerError: SatelliteContextResponse = {
      ...snapshotContext,
      status: "error",
      snapshot: undefined,
      error: "Satellite snapshot area is too tall for contextual imagery.",
      limitations: ["Satellite snapshot context is unavailable for this area."]
    };

    await useSatelliteContextStore.getState().refresh(
      { south: -90, west: -180, north: 90, east: 180 },
      {
        getSatelliteContext: async () => providerError
      }
    );

    expect(useSatelliteContextStore.getState()).toMatchObject({
      status: "success",
      error: null,
      result: {
        status: "error",
        error: "Satellite snapshot area is too tall for contextual imagery."
      }
    });
  });
});

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

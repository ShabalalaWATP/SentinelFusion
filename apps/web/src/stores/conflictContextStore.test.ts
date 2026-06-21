import { describe, expect, it } from "vitest";
import type { ConflictContextResponse } from "@aisstream/shared";
import { useConflictContextStore } from "./conflictContextStore";

const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const timestamp = "2026-06-21T10:00:00.000Z";

const conflictContext: ConflictContextResponse = {
  status: "ok",
  mode: "live",
  provider: "acled",
  source: {
    title: "ACLED conflict and protest events",
    url: "https://acleddata.com/api-documentation/acled-endpoint",
    attribution: "Conflict and protest data by ACLED"
  },
  generatedAt: timestamp,
  cached: false,
  area: bounds,
  lookbackDays: 14,
  events: [],
  summary: {
    count: 0,
    protestCount: 0,
    riotCount: 0,
    politicalViolenceCount: 0,
    fatalityCount: 0,
    highSeverityCount: 0
  },
  risk: {
    level: "low",
    reasons: ["No reported conflict or protest events were returned for this area."]
  },
  limitations: ["Conflict and protest events are based on reported sources."]
};

describe("conflictContextStore", () => {
  it("loads conflict context", async () => {
    useConflictContextStore.getState().reset();

    await useConflictContextStore.getState().refresh(bounds, {
      getConflictContext: async () => conflictContext
    });

    expect(useConflictContextStore.getState()).toMatchObject({
      status: "success",
      result: conflictContext,
      error: null
    });
  });

  it("keeps not-configured provider states as successful API results", async () => {
    useConflictContextStore.getState().reset();
    const notConfigured: ConflictContextResponse = {
      ...conflictContext,
      status: "not_configured",
      limitations: ["Set ACLED credentials on the API server to enable live events."]
    };

    await useConflictContextStore.getState().refresh(bounds, {
      getConflictContext: async () => notConfigured
    });

    expect(useConflictContextStore.getState().status).toBe("success");
    expect(useConflictContextStore.getState().result?.status).toBe("not_configured");
  });

  it("captures transport errors", async () => {
    useConflictContextStore.getState().reset();

    await useConflictContextStore.getState().refresh(bounds, {
      getConflictContext: async () => {
        throw new Error("failed");
      }
    });

    expect(useConflictContextStore.getState()).toMatchObject({
      status: "error",
      error: "failed"
    });
  });
});

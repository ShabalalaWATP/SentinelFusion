import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./apiClient";
import { useAnalysisAccessStore } from "../stores/analysisAccessStore";

const bounds = {
  south: 50.68,
  west: -1.28,
  north: 50.9,
  east: -0.86
};

describe("apiClient", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAnalysisAccessStore.getState().clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the analysis bearer token only to protected requests", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.includes("/context/conflict-events")
        ? conflictResponse()
        : { status: "ok", mode: "live", timestamp: new Date().toISOString() };

      return {
        ok: true,
        json: async () => body
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    useAnalysisAccessStore.getState().setToken("test-token");
    const client = createApiClient("http://localhost:4000");

    await client.getConflictContext(bounds);
    await client.getHealth();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/context/conflict-events?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          accept: "application/json"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/health",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String) as string
        })
      })
    );
  });
});

function conflictResponse() {
  return {
    status: "ok",
    mode: "live",
    provider: "acled",
    source: {
      title: "ACLED conflict events",
      url: "https://acleddata.com",
      attribution: "ACLED"
    },
    generatedAt: new Date().toISOString(),
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
      reasons: ["No recent ACLED events were found in the selected area."]
    },
    limitations: ["ACLED coverage depends on source reporting and publication cadence."]
  };
}

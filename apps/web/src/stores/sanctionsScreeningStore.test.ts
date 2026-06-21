import { describe, expect, it } from "vitest";
import type { SanctionsScreeningResponse } from "@aisstream/shared";
import { useSanctionsScreeningStore } from "./sanctionsScreeningStore";

const vesselId = "mmsi-232001234";
const screeningContext: SanctionsScreeningResponse = {
  status: "not_configured",
  mode: "off",
  provider: "opensanctions",
  source: {
    title: "OpenSanctions API",
    url: "https://www.opensanctions.org/docs/api/",
    attribution: "Configured provider required"
  },
  generatedAt: "2026-06-21T12:00:00.000Z",
  cached: false,
  subject: {
    vesselId,
    mmsi: "232001234",
    name: "NORTHERN LIGHT",
    shipType: "Cargo"
  },
  matches: [],
  summary: {
    matchCount: 0,
    reviewRequiredCount: 0
  },
  limitations: ["Provider not configured."],
  error: "Sanctions screening provider is not configured."
};

describe("sanctionsScreeningStore", () => {
  it("loads selected-vessel screening context", async () => {
    useSanctionsScreeningStore.getState().reset();

    await useSanctionsScreeningStore.getState().refresh(vesselId, {
      getSanctionsScreening: async () => screeningContext
    });

    const state = useSanctionsScreeningStore.getState();
    expect(state.statuses[vesselId]).toBe("success");
    expect(state.results[vesselId]?.status).toBe("not_configured");
  });

  it("does not let stale responses overwrite the latest vessel result", async () => {
    useSanctionsScreeningStore.getState().reset();
    let resolveFirst: ((value: SanctionsScreeningResponse) => void) | undefined;
    const first = new Promise<SanctionsScreeningResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const second = {
      ...screeningContext,
      provider: "custom" as const
    };
    const firstRefresh = useSanctionsScreeningStore.getState().refresh(vesselId, {
      getSanctionsScreening: (() => first) as () => Promise<SanctionsScreeningResponse>
    });

    await useSanctionsScreeningStore.getState().refresh(vesselId, {
      getSanctionsScreening: async () => second
    });
    resolveFirst?.(screeningContext);
    await firstRefresh;

    expect(useSanctionsScreeningStore.getState().results[vesselId]?.provider).toBe("custom");
  });

  it("captures request errors", async () => {
    useSanctionsScreeningStore.getState().reset();

    await useSanctionsScreeningStore.getState().refresh(vesselId, {
      getSanctionsScreening: async () => {
        throw new Error("offline");
      }
    });

    const state = useSanctionsScreeningStore.getState();
    expect(state.statuses[vesselId]).toBe("error");
    expect(state.errors[vesselId]).toBe("offline");
  });
});

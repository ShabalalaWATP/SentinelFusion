import { describe, expect, it } from "vitest";
import { selectEnabledAlertPresetCount, useAlertStore } from "./alertStore";

describe("alertStore", () => {
  it("toggles and resets alert presets", () => {
    useAlertStore.getState().resetPresets();
    const initialCount = selectEnabledAlertPresetCount(useAlertStore.getState());

    useAlertStore.getState().togglePreset("providerHealth");
    useAlertStore.getState().setPreset("staleContacts", true);

    expect(useAlertStore.getState().presets.providerHealth).toBe(false);
    expect(useAlertStore.getState().presets.staleContacts).toBe(true);
    expect(selectEnabledAlertPresetCount(useAlertStore.getState())).toBe(initialCount);

    useAlertStore.getState().resetPresets();

    expect(useAlertStore.getState().presets.providerHealth).toBe(true);
    expect(useAlertStore.getState().presets.staleContacts).toBe(false);
  });

  it("advances provider incident epochs only after recovery", () => {
    const firstEpoch = useAlertStore
      .getState()
      .updateProviderIncident("aircraft", false, "2026-06-11T10:00:00.000Z");
    const sameEpoch = useAlertStore
      .getState()
      .updateProviderIncident("aircraft", false, "2026-06-11T10:05:00.000Z");

    useAlertStore
      .getState()
      .updateProviderIncident("aircraft", true, "2026-06-11T10:10:00.000Z");

    const nextEpoch = useAlertStore
      .getState()
      .updateProviderIncident("aircraft", false, "2026-06-11T10:20:00.000Z");

    expect(firstEpoch).toBe("2026-06-11T10:00:00.000Z");
    expect(sameEpoch).toBe(firstEpoch);
    expect(nextEpoch).toBe("2026-06-11T10:20:00.000Z");
  });
});

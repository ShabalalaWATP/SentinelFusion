import { describe, expect, it } from "vitest";
import { selectActiveFeedFilterCount, useFeedFilterStore } from "./feedFilterStore";

describe("feedFilterStore", () => {
  it("persists feed confidence settings and resets defaults", () => {
    useFeedFilterStore.getState().resetSettings();

    useFeedFilterStore.getState().setSetting("hideStaleContacts", true);
    useFeedFilterStore.getState().setSetting("hideUnhealthyFeeds", true);
    useFeedFilterStore.getState().setSetting("maxContactAgeMinutes", 25);

    expect(selectActiveFeedFilterCount(useFeedFilterStore.getState())).toBe(2);
    expect(useFeedFilterStore.getState().settings.maxContactAgeMinutes).toBe(25);

    useFeedFilterStore.getState().resetSettings();

    expect(selectActiveFeedFilterCount(useFeedFilterStore.getState())).toBe(0);
    expect(useFeedFilterStore.getState().settings.maxContactAgeMinutes).toBe(10);
  });
});

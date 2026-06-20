import { describe, expect, it } from "vitest";
import { shouldQueueAutoClassifiedIntel } from "./useAutoClassifiedIntel";

describe("shouldQueueAutoClassifiedIntel", () => {
  it("only auto-queues idle classified vessels without cached results", () => {
    expect(shouldQueueAutoClassifiedIntel(false, undefined, false)).toBe(true);
    expect(shouldQueueAutoClassifiedIntel(false, "idle", false)).toBe(true);
    expect(shouldQueueAutoClassifiedIntel(true, "idle", false)).toBe(false);
    expect(shouldQueueAutoClassifiedIntel(false, "loading", false)).toBe(false);
    expect(shouldQueueAutoClassifiedIntel(false, "error", false)).toBe(false);
    expect(shouldQueueAutoClassifiedIntel(false, "success", false)).toBe(false);
    expect(shouldQueueAutoClassifiedIntel(false, "idle", true)).toBe(false);
  });
});

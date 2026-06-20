import { describe, expect, it } from "vitest";
import { mapStyleRegistry } from "./MapStyleRegistry";

describe("MapStyleRegistry", () => {
  it("exposes the required Stage 1 map styles", () => {
    const ids = mapStyleRegistry.listStyles().map((style) => style.id);

    expect(ids).toEqual([
      "dark",
      "light",
      "streets",
      "satellite",
      "satellite-hybrid",
      "terrain",
      "outdoor"
    ]);
  });

  it("exposes Mercator and globe projections", () => {
    expect(mapStyleRegistry.listProjections().map((projection) => projection.id)).toEqual([
      "mercator",
      "globe"
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { parseNaturalRule, useTrafficRuleStore } from "./trafficRuleStore";

describe("trafficRuleStore", () => {
  it("parses natural area watch rules", () => {
    const rule = parseNaturalRule("Track all activity across the Hormuz Strait and highlight it");

    expect(rule).toMatchObject({
      area: { id: "hormuz" },
      domain: "all",
      areaOnly: false,
      active: true
    });
  });

  it("infers aircraft-only area filters", () => {
    const rule = parseNaturalRule("Only show flights inside the Taiwan Strait");

    expect(rule).toMatchObject({
      area: { id: "taiwan-strait" },
      domain: "aircraft",
      areaOnly: true
    });
  });

  it("stores active rules and reports unmatched areas", () => {
    useTrafficRuleStore.setState({
      draft: "",
      events: [],
      lastError: null,
      rules: []
    });

    const added = useTrafficRuleStore
      .getState()
      .addNaturalRule("Watch all ships around Gibraltar");

    expect(added?.area.id).toBe("gibraltar");
    expect(useTrafficRuleStore.getState().rules).toHaveLength(1);

    const missing = useTrafficRuleStore.getState().addNaturalRule("Watch nowhere real");

    expect(missing).toBeNull();
    expect(useTrafficRuleStore.getState().lastError).toContain("known operating area");
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMapStore } from "../../stores/mapStore";
import { MapControls } from "./MapControls";

describe("MapControls", () => {
  beforeEach(() => {
    cleanup();
    useMapStore.setState({
      styleId: "dark",
      projection: "mercator",
      intelligenceLayers: {
        airports: false,
        chokepoints: true,
        "conflict-events": false,
        "fire-anomalies": false,
        "maritime-zones": false,
        ports: true,
        "risk-zones": true,
        "shipping-lanes": true
      }
    });
  });

  it("collapses by default and updates map style, projection, and intelligence layers", () => {
    render(<MapControls />);

    expect(screen.queryByLabelText("Map style")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Map controls/i }));

    const styleSelect = screen.getByLabelText("Map style");
    fireEvent.change(styleSelect, { target: { value: "light" } });
    fireEvent.click(screen.getByRole("button", { name: "Globe" }));
    fireEvent.click(screen.getByRole("button", { name: "Airports" }));
    fireEvent.click(screen.getByRole("button", { name: "Conflict" }));

    const state = useMapStore.getState();
    expect(state.styleId).toBe("light");
    expect(state.projection).toBe("globe");
    expect(state.intelligenceLayers.airports).toBe(true);
    expect(state.intelligenceLayers["conflict-events"]).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Map controls/i }));

    expect(screen.queryByLabelText("Map style")).toBeNull();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  selectActiveAircraftFilterCount,
  useAircraftFilterStore
} from "../../stores/aircraftFilterStore";
import { AircraftFilterControls } from "./AircraftFilterControls";

describe("AircraftFilterControls", () => {
  beforeEach(() => {
    cleanup();
    useAircraftFilterStore.getState().resetFilters();
  });

  it("updates shared aircraft filters and resets them", () => {
    render(<AircraftFilterControls />);

    fireEvent.change(screen.getByLabelText("Search aircraft"), {
      target: { value: "RFR" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Military" }));
    fireEvent.change(screen.getByLabelText("Min ft"), {
      target: { value: "10000" }
    });

    expect(useAircraftFilterStore.getState().filters.query).toBe("RFR");
    expect(useAircraftFilterStore.getState().filters.classifications).toEqual(["military"]);
    expect(selectActiveAircraftFilterCount(useAircraftFilterStore.getState())).toBe(3);
    expect(screen.getByText("3 active")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(useAircraftFilterStore.getState().filters.query).toBe("");
    expect(selectActiveAircraftFilterCount(useAircraftFilterStore.getState())).toBe(0);
  });
});

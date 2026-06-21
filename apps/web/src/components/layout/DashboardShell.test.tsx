import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardShell } from "./DashboardShell";

const shellMocks = vi.hoisted(() => ({
  mapCanvas: vi.fn(({ showRoutes }: { showRoutes: boolean }) => (
    <div>map routes {showRoutes ? "on" : "off"}</div>
  )),
  topMetricsBar: vi.fn(() => <div>metrics</div>),
  vesselDrawer: vi.fn(
    ({ activePanel }: { activePanel: string; onPanelChange(panel: string): void }) => (
      <div>drawer {activePanel}</div>
    )
  )
}));

vi.mock("../map/MapCanvas", () => ({
  MapCanvas: shellMocks.mapCanvas
}));
vi.mock("../metrics/TopMetricsBar", () => ({
  TopMetricsBar: shellMocks.topMetricsBar
}));
vi.mock("../vessels/VesselDrawer", () => ({
  VesselDrawer: shellMocks.vesselDrawer
}));

describe("DashboardShell", () => {
  it("switches rail panels and passes route state into the map and drawer", async () => {
    render(<DashboardShell />);

    expect(screen.getByText("metrics")).toBeTruthy();
    expect(screen.getByText("Loading map")).toBeTruthy();
    expect(await screen.findByText("map routes off")).toBeTruthy();
    expect(screen.getByText("drawer overview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vessel overview" }).getAttribute("aria-pressed")).toBe(
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Routes and observed tracks" }));

    expect(screen.getByText("map routes on")).toBeTruthy();
    expect(screen.getByText("drawer routes")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Routes and observed tracks" }).getAttribute(
        "aria-pressed"
      )
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText("drawer settings")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" }).getAttribute("aria-pressed")).toBe(
      "true"
    );
  });
});

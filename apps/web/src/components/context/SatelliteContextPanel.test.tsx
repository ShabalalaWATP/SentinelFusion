import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisAreaResult, SatelliteContextResponse } from "@aisstream/shared";
import { useSatelliteContextStore } from "../../stores/satelliteContextStore";
import { SatelliteContextPanel } from "./SatelliteContextPanel";

const timestamp = "2026-06-21T12:00:00.000Z";
const area: AnalysisAreaResult = {
  id: "portsmouth",
  name: "Portsmouth",
  bounds: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
  count: 0,
  listedCount: 0,
  highRiskCount: 0,
  militaryCount: 0,
  averageSpeedKn: 0,
  aircraftCount: 0,
  listedAircraftCount: 0,
  militaryAircraftCount: 0,
  emergencyAircraftCount: 0,
  averageAircraftAltitudeFt: 0,
  averageAircraftSpeedKt: 0,
  vessels: [],
  aircraft: []
};

const satelliteContext: SatelliteContextResponse = {
  status: "ok",
  mode: "live",
  provider: "nasa-gibs",
  source: {
    title: "NASA GIBS imagery",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    attribution: "Satellite imagery by NASA Global Imagery Browse Services"
  },
  generatedAt: timestamp,
  cached: false,
  area: area.bounds,
  snapshot: {
    id: "snapshot-1",
    title: "VIIRS SNPP corrected reflectance true colour",
    layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    imageUrl: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
    acquiredDate: "2026-06-20",
    format: "image/jpeg",
    width: 512,
    height: 512,
    projection: "EPSG:4326",
    area: area.bounds
  },
  limitations: ["GIBS browse imagery is contextual."]
};

describe("SatelliteContextPanel", () => {
  beforeEach(() => {
    cleanup();
    useSatelliteContextStore.setState({
      status: "idle",
      result: null,
      error: null,
      refresh: async () => undefined
    });
  });

  it("requests satellite context for the analysed area", () => {
    const refresh = vi.fn(async () => undefined);
    useSatelliteContextStore.setState({ refresh });

    render(<SatelliteContextPanel area={area} />);

    expect(refresh).toHaveBeenCalledWith(area.bounds);
  });

  it("renders a live snapshot image and source attribution", () => {
    useSatelliteContextStore.setState({
      status: "success",
      result: satelliteContext
    });

    render(<SatelliteContextPanel area={area} />);

    expect(screen.getByText("VIIRS SNPP corrected reflectance true colour")).toBeTruthy();
    expect(screen.getAllByText(/2026-06-20/).length).toBeGreaterThan(0);
    const image = screen.getByAltText(/satellite snapshot/i);
    expect(image.getAttribute("src")).toContain("https://gibs.earthdata.nasa.gov/wms/");
    expect(screen.getByRole("link", { name: /source/i })).toBeTruthy();
  });

  it("renders provider not-configured state clearly", () => {
    useSatelliteContextStore.setState({
      status: "success",
      result: {
        ...satelliteContext,
        status: "not_configured",
        mode: "off",
        snapshot: undefined,
        limitations: ["Satellite snapshot provider access is not configured for this deployment."],
        error: "Satellite snapshot provider is not configured."
      }
    });

    render(<SatelliteContextPanel area={area} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle satellite snapshot" }));

    expect(screen.getByText("Satellite snapshot provider is not configured.")).toBeTruthy();
    expect(screen.getByText(/provider access is not configured/i)).toBeTruthy();
  });

  it("does not render unsafe snapshot URLs", () => {
    useSatelliteContextStore.setState({
      status: "success",
      result: {
        ...satelliteContext,
        snapshot: {
          ...satelliteContext.snapshot!,
          imageUrl: "javascript:alert(1)"
        } as SatelliteContextResponse["snapshot"]
      }
    });

    render(<SatelliteContextPanel area={area} />);

    expect(document.body.innerHTML).not.toContain("javascript:alert");
    expect(screen.getByText("Snapshot URL unavailable")).toBeTruthy();
  });

  it("renders mock snapshots without requesting remote imagery", () => {
    useSatelliteContextStore.setState({
      status: "success",
      result: {
        ...satelliteContext,
        mode: "mock",
        provider: "mock",
        source: {
          ...satelliteContext.source,
          title: "Mock satellite snapshot",
          attribution: "Mock satellite snapshot for local development"
        },
        snapshot: {
          ...satelliteContext.snapshot!,
          layerId: "mock-satellite-snapshot",
          imageUrl: undefined
        }
      }
    });

    render(<SatelliteContextPanel area={area} />);

    expect(screen.getByText("Mock satellite snapshot")).toBeTruthy();
    expect(screen.queryByAltText(/satellite snapshot/i)).toBeNull();
    expect(document.body.innerHTML).not.toContain("gibs.earthdata.nasa.gov");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Aircraft, AircraftIntelResponse } from "@aisstream/shared";
import { useAircraftIntelStore } from "../../stores/aircraftIntelStore";
import { AircraftIntelPanel } from "./AircraftIntelPanel";

const timestamp = "2026-06-11T10:00:00.000Z";

const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  registration: "ZZ343",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: -1.1,
  latitude: 50.8,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  squawk: "7001",
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "mock",
  lastUpdated: timestamp,
  track: [{ longitude: -1.1, latitude: 50.8, altitudeFt: 18000, timestamp }]
};

describe("AircraftIntelPanel", () => {
  beforeEach(() => {
    cleanup();
    useAircraftIntelStore.getState().reset();
  });

  it("does not render active or non-web URL schemes from aircraft intel", () => {
    const result: AircraftIntelResponse = {
      status: "ok",
      mode: "live",
      model: "test",
      aircraftId: aircraft.id,
      summary: "Public sources identify the aircraft.",
      facts: ["ICAO hex 43c6f1 appears in a public aircraft registry."],
      sources: [
        { title: "Unsafe source", url: "javascript:alert(1)" },
        { title: "Safe registry", url: "https://example.com/aircraft/43c6f1" }
      ],
      image: {
        imageUrl: "data:image/svg+xml,<svg></svg>",
        thumbnailUrl: "ftp://example.com/aircraft.jpg",
        sourceUrl: "javascript:alert(1)",
        caption: "Unsafe image"
      },
      images: [
        {
          imageUrl: "https://example.com/images/primary.jpg",
          thumbnailUrl: "https://example.com/images/primary-thumb.jpg"
        },
        {
          imageUrl: "javascript:alert(1)",
          thumbnailUrl: "data:image/svg+xml,<svg></svg>",
          sourceUrl: "javascript:alert(1)"
        },
        {
          imageUrl: "https://example.com/images/gallery.jpg",
          thumbnailUrl: "https://example.com/images/gallery-thumb.jpg",
          sourceUrl: "https://example.com/aircraft/43c6f1"
        }
      ],
      limitations: ["Public records may lag current ADS-B telemetry."],
      generatedAt: timestamp
    };
    useAircraftIntelStore.setState({
      statuses: { [aircraft.id]: "success" },
      results: { [aircraft.id]: result }
    });

    render(<AircraftIntelPanel aircraft={aircraft} />);

    const links = [...document.querySelectorAll("a")].map((link) => link.href);
    const images = [...document.querySelectorAll("img")].map((image) => image.src);

    expect(screen.queryByText("Unsafe source")).toBeNull();
    expect(screen.getByText("Safe registry")).toBeTruthy();
    expect(links).toEqual([
      "https://example.com/aircraft/43c6f1",
      "https://example.com/aircraft/43c6f1"
    ]);
    expect(images).toEqual(["https://example.com/images/gallery-thumb.jpg"]);
    expect(document.body.innerHTML).not.toContain("javascript:");
    expect(document.body.innerHTML).not.toContain("data:image");
    expect(document.body.innerHTML).not.toContain("ftp://");
  });
});

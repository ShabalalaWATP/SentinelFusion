import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Vessel, VesselIntelResponse } from "@aisstream/shared";
import { useVesselIntelStore } from "../../stores/vesselIntelStore";
import { VesselIntelPanel } from "./VesselIntelPanel";

const timestamp = "2026-06-11T10:00:00.000Z";

const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.2,
  latitude: 51.7,
  speedOverGround: 12.5,
  courseOverGround: 86,
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.2, latitude: 51.7, timestamp }]
};

describe("VesselIntelPanel", () => {
  beforeEach(() => {
    cleanup();
    useVesselIntelStore.getState().reset();
  });

  it("does not render active or non-web URL schemes from vessel intel", () => {
    const result: VesselIntelResponse = {
      status: "ok",
      mode: "live",
      model: "test",
      vesselId: vessel.id,
      summary: "Public sources identify the vessel.",
      profile: {
        matchedName: "HMS Example",
        militaryClass: "Type 45 destroyer",
        classification: "military",
        confidence: "high"
      },
      facts: ["MMSI 232001234 appears in a public vessel registry."],
      sources: [
        { title: "Unsafe source", url: "javascript:alert(1)" },
        { title: "Safe registry", url: "https://example.com/vessels/232001234" }
      ],
      image: {
        imageUrl: "data:image/svg+xml,<svg></svg>",
        thumbnailUrl: "ftp://example.com/vessel.jpg",
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
          sourceUrl: "https://example.com/vessels/232001234"
        }
      ],
      limitations: ["Public records may lag current AIS telemetry."],
      generatedAt: timestamp
    };
    useVesselIntelStore.setState({
      statuses: { [vessel.id]: "success" },
      results: { [vessel.id]: result }
    });

    render(<VesselIntelPanel vessel={vessel} />);

    const links = [...document.querySelectorAll("a")].map((link) => link.href);
    const images = [...document.querySelectorAll("img")].map((image) => image.src);

    expect(screen.queryByText("Unsafe source")).toBeNull();
    expect(screen.getByText("Safe registry")).toBeTruthy();
    expect(screen.getByText("Type 45 destroyer")).toBeTruthy();
    expect(links).toEqual([
      "https://example.com/vessels/232001234",
      "https://example.com/vessels/232001234"
    ]);
    expect(images).toEqual(["https://example.com/images/gallery-thumb.jpg"]);
    expect(document.body.innerHTML).not.toContain("javascript:");
    expect(document.body.innerHTML).not.toContain("data:image");
    expect(document.body.innerHTML).not.toContain("ftp://");
  });
});

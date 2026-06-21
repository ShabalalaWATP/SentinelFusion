import { describe, expect, it } from "vitest";
import type { AirportContextResponse } from "@aisstream/shared";
import { toAirportContextCollection, updateAirportContextSource } from "./airportContextOverlay";

const airportContext: AirportContextResponse = {
  status: "ok",
  mode: "live",
  source: {
    title: "OurAirports open airport data",
    url: "https://ourairports.com/data/",
    attribution: "Airport and runway open data by OurAirports"
  },
  generatedAt: "2026-06-21T11:00:00.000Z",
  cached: false,
  airports: [
    {
      id: "2538",
      ident: "EGHF",
      type: "small_airport",
      name: "Lee-on-Solent Airport",
      latitude: 50.815,
      longitude: -1.207,
      scheduledService: false,
      sourceUrl: "https://ourairports.com/airports/EGHF/",
      distanceKm: 0.6,
      bearingDegrees: 160,
      runways: []
    }
  ],
  summary: {
    count: 1,
    scheduledServiceCount: 0,
    runwayCount: 0
  },
  limitations: ["OurAirports is public-domain community data."]
};

describe("airport context overlay data", () => {
  it("converts airport context into a GeoJSON point collection", () => {
    const collection = toAirportContextCollection(airportContext);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [-1.207, 50.815]
      },
      properties: {
        id: "2538",
        ident: "EGHF",
        label: "EGHF",
        type: "small_airport"
      }
    });
  });

  it("does not map provider error states as live airport points", () => {
    const collection = toAirportContextCollection({
      ...airportContext,
      status: "error",
      airports: []
    });

    expect(collection.features).toHaveLength(0);
  });

  it("pushes enriched airport coordinates into the map source", () => {
    const updates: unknown[] = [];
    const map = {
      getSource: () => ({ setData: (data: unknown) => updates.push(data) })
    };

    updateAirportContextSource(
      map as unknown as Parameters<typeof updateAirportContextSource>[0],
      toAirportContextCollection(airportContext)
    );

    expect(updates[0]).toMatchObject({
      features: [
        {
          geometry: {
            coordinates: [-1.207, 50.815]
          }
        }
      ]
    });
  });
});

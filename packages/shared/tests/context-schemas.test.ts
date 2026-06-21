import { describe, expect, it } from "vitest";
import {
  airportContextResponseSchema,
  fireContextResponseSchema,
  marineWeatherResponseSchema,
  satelliteContextResponseSchema
} from "../src";

const now = new Date("2026-06-20T12:00:00.000Z").toISOString();

describe("context schemas", () => {
  it("validates marine weather context responses", () => {
    const parsed = marineWeatherResponseSchema.parse({
      status: "ok",
      mode: "live",
      source: {
        title: "Open-Meteo Marine Weather",
        url: "https://open-meteo.com/en/docs/marine-weather-api",
        attribution: "Weather data by Open-Meteo"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      location: { latitude: 50.79, longitude: -1.04, label: "Selected area centre" },
      current: {
        time: now,
        waveHeightM: 0.9,
        waveDirectionDeg: 240,
        wavePeriodSeconds: 4.8,
        seaSurfaceTemperatureC: 14.2,
        oceanCurrentVelocityKt: 0.3
      },
      forecast: [
        {
          time: now,
          waveHeightM: 1.1,
          wavePeriodSeconds: 5.1
        }
      ],
      risk: {
        level: "low",
        reasons: ["Current sea state is below configured concern thresholds."]
      },
      limitations: ["Marine weather is modelled at the nearest sea grid point."]
    });

    expect(parsed.current?.waveHeightM).toBe(0.9);
    expect(parsed.forecast).toHaveLength(1);
  });

  it("rejects active URL schemes in marine weather source metadata", () => {
    expect(() =>
      marineWeatherResponseSchema.parse({
        status: "ok",
        mode: "live",
        source: {
          title: "Unsafe provider",
          url: "javascript:alert(1)",
          attribution: "Unsafe"
        },
        generatedAt: now,
        cached: false,
        location: { latitude: 50.79, longitude: -1.04 },
        risk: {
          level: "low",
          reasons: ["No concern threshold was crossed."]
        },
        limitations: ["Test limitation."]
      })
    ).toThrow();
  });

  it("validates fire context responses", () => {
    const parsed = fireContextResponseSchema.parse({
      status: "ok",
      mode: "live",
      source: {
        title: "NASA FIRMS Active Fire",
        url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
        attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      sourceDataset: "VIIRS_SNPP_NRT",
      dayRange: 1,
      detections: [
        {
          id: "VIIRS_SNPP_NRT:50.79000:-1.04000:2026-06-21T09:30:00.000Z:18.60",
          latitude: 50.79,
          longitude: -1.04,
          acquiredAt: "2026-06-21T09:30:00.000Z",
          confidence: "high",
          rawConfidence: "h",
          satellite: "N",
          instrument: "VIIRS",
          version: "2.0NRT",
          dayNight: "day",
          brightnessKelvin: 331.4,
          fireRadiativePowerMw: 18.6
        }
      ],
      summary: {
        count: 1,
        highConfidenceCount: 1,
        dayCount: 1,
        nightCount: 0,
        maxFireRadiativePowerMw: 18.6,
        latestAcquiredAt: "2026-06-21T09:30:00.000Z"
      },
      risk: {
        level: "medium",
        reasons: ["One active fire detection may affect area operations."]
      },
      limitations: [
        "FIRMS active-fire points are satellite thermal detections and can include false positives or missed fires."
      ]
    });

    expect(parsed.detections[0]?.confidence).toBe("high");
    expect(parsed.summary.maxFireRadiativePowerMw).toBe(18.6);
  });

  it("validates airport and runway context responses", () => {
    const parsed = airportContextResponseSchema.parse({
      status: "ok",
      mode: "live",
      source: {
        title: "OurAirports open airport data",
        url: "https://ourairports.com/data/",
        attribution: "Airport and runway open data by OurAirports"
      },
      generatedAt: now,
      cached: false,
      focus: {
        latitude: 50.82,
        longitude: -1.21,
        label: "RFR7182",
        aircraftId: "icao24-407abc"
      },
      airports: [
        {
          id: "2538",
          ident: "EGHF",
          type: "small_airport",
          name: "Lee-on-Solent Airport",
          latitude: 50.815,
          longitude: -1.207,
          elevationFt: 32,
          isoCountry: "GB",
          municipality: "Lee-on-Solent",
          scheduledService: false,
          gpsCode: "EGHF",
          sourceUrl: "https://ourairports.com/airports/EGHF/",
          distanceKm: 0.6,
          bearingDegrees: 160,
          runways: [
            {
              id: "2",
              lengthFt: 3480,
              widthFt: 100,
              surface: "ASP",
              lighted: false,
              closed: false,
              lowEnd: { ident: "05", headingDegrees: 45 },
              highEnd: { ident: "23", headingDegrees: 225 }
            }
          ]
        }
      ],
      summary: {
        count: 1,
        scheduledServiceCount: 0,
        runwayCount: 1,
        nearestDistanceKm: 0.6,
        longestRunwayFt: 3480
      },
      limitations: ["OurAirports is public-domain community data."]
    });

    expect(parsed.airports[0]?.ident).toBe("EGHF");
    expect(parsed.summary.longestRunwayFt).toBe(3480);
  });

  it("validates satellite snapshot context responses", () => {
    const parsed = satelliteContextResponseSchema.parse({
      status: "ok",
      mode: "live",
      provider: "nasa-gibs",
      source: {
        title: "NASA GIBS imagery",
        url: "https://nasa-gibs.github.io/gibs-api-docs/",
        attribution: "Satellite imagery by NASA Global Imagery Browse Services"
      },
      generatedAt: now,
      cached: false,
      area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 },
      snapshot: {
        id: "nasa-gibs:VIIRS_SNPP_CorrectedReflectance_TrueColor:2026-06-19:50.68:-1.28:50.9:-0.86",
        title: "VIIRS SNPP corrected reflectance true colour",
        layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        imageUrl:
          "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap",
        acquiredDate: "2026-06-19",
        format: "image/jpeg",
        width: 512,
        height: 512,
        projection: "EPSG:4326",
        area: { south: 50.68, west: -1.28, north: 50.9, east: -0.86 }
      },
      limitations: ["GIBS browse imagery is contextual and may be obscured by cloud."]
    });

    expect(parsed.snapshot?.layerId).toBe("VIIRS_SNPP_CorrectedReflectance_TrueColor");
    expect(parsed.snapshot?.width).toBe(512);
  });
});

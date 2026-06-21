import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  Aircraft,
  AircraftMetrics,
  AirportContextResponse,
  Vessel,
  VesselMetrics
} from "@aisstream/shared";
import { registerAircraftRoutes } from "../src/routes/aircraft";
import { registerVesselRoutes } from "../src/routes/vessels";
import type {
  IAircraftAnalyticsService,
  IAircraftRepository,
  IVesselAnalyticsService,
  IVesselRepository
} from "../src/domain/interfaces";

const timestamp = "2026-06-20T12:00:00.000Z";
const aircraft: Aircraft = {
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  registration: "ZZ343",
  aircraftType: "Airbus A400M Atlas",
  operator: "Royal Air Force",
  longitude: -1.75,
  latitude: 51.2,
  altitudeFt: 18000,
  groundSpeedKt: 310,
  trackDegrees: 138,
  verticalRateFpm: 300,
  squawk: "7001",
  emergency: false,
  onGround: false,
  classification: "military",
  riskLevel: "medium",
  source: "mock",
  lastUpdated: timestamp,
  track: [{ longitude: -1.75, latitude: 51.2, altitudeFt: 18000, timestamp }]
};
const vessel: Vessel = {
  id: "mmsi-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  shipType: "Cargo",
  longitude: 1.3,
  latitude: 51.95,
  speedOverGround: 13.2,
  courseOverGround: 76,
  heading: 74,
  destination: "Felixstowe",
  navigationalStatus: "Under way using engine",
  riskLevel: "low",
  lastUpdated: timestamp,
  track: [{ longitude: 1.3, latitude: 51.95, timestamp }]
};

let app: ReturnType<typeof Fastify> | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("aircraft route contracts", () => {
  it("returns 503 when aircraft intel is not wired into the route", async () => {
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository: aircraftRepository([aircraft]),
      analytics: aircraftAnalytics(),
      intelService: undefined
    });

    const response = await app.inject({
      method: "POST",
      url: `/aircraft/${aircraft.id}/intel`
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "Aircraft intel service is unavailable." });
  });

  it("validates aircraft ids before repository lookup", async () => {
    const repository = aircraftRepository([aircraft]);
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository,
      analytics: aircraftAnalytics(),
      intelService: {
        enrich: vi.fn()
      }
    });

    const response = await app.inject({
      method: "POST",
      url: `/aircraft/${"x".repeat(81)}/intel`
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Aircraft id is invalid." });
    expect(repository.getById).not.toHaveBeenCalled();
  });

  it("returns 404 when aircraft intel targets an unknown aircraft", async () => {
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository: aircraftRepository([aircraft]),
      analytics: aircraftAnalytics(),
      intelService: {
        enrich: vi.fn()
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/aircraft/icao24-000000/intel"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Requested aircraft was not found." });
  });

  it("validates airport context route dependencies, ids, resources, and radius", async () => {
    const repository = aircraftRepository([aircraft]);
    const airportContextService = {
      getAreaAirports: vi.fn(),
      getNearbyAirports: vi.fn(async () => airportContextResponse())
    };
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository,
      analytics: aircraftAnalytics(),
      airportContextService
    });

    const unavailable = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/airport-context`,
      // This route was already registered with a service, so use a second app below for 503.
    });
    expect(unavailable.statusCode).toBe(200);

    await app.close();
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository,
      analytics: aircraftAnalytics(),
      airportContextService: undefined
    });
    const missingService = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/airport-context`
    });
    expect(missingService.statusCode).toBe(503);

    await app.close();
    app = Fastify();
    await registerAircraftRoutes(app, {
      repository,
      analytics: aircraftAnalytics(),
      airportContextService
    });

    const invalidId = await app.inject({
      method: "GET",
      url: `/aircraft/${"x".repeat(81)}/airport-context`
    });
    const invalidQuery = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/airport-context?radiusKm=0`
    });
    const unknown = await app.inject({
      method: "GET",
      url: "/aircraft/icao24-000000/airport-context"
    });
    const valid = await app.inject({
      method: "GET",
      url: `/aircraft/${aircraft.id}/airport-context?radiusKm=50`
    });

    expect(invalidId.statusCode).toBe(400);
    expect(invalidQuery.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
    expect(valid.statusCode).toBe(200);
    expect(airportContextService.getNearbyAirports).toHaveBeenLastCalledWith({
      aircraftId: aircraft.id,
      label: aircraft.callsign,
      latitude: aircraft.latitude,
      longitude: aircraft.longitude,
      radiusKm: 50
    });
  });
});

describe("vessel route contracts", () => {
  it("returns 503 when vessel intel is not wired into the route", async () => {
    app = Fastify();
    await registerVesselRoutes(app, {
      repository: vesselRepository([vessel]),
      analytics: vesselAnalytics(),
      intelService: undefined
    });

    const response = await app.inject({
      method: "POST",
      url: `/vessels/${vessel.id}/intel`
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "Vessel intel service is unavailable." });
  });

  it("validates vessel ids before repository lookup", async () => {
    const repository = vesselRepository([vessel]);
    app = Fastify();
    await registerVesselRoutes(app, {
      repository,
      analytics: vesselAnalytics(),
      intelService: {
        enrich: vi.fn()
      }
    });

    const response = await app.inject({
      method: "POST",
      url: `/vessels/${"x".repeat(81)}/intel`
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Vessel id is invalid." });
    expect(repository.getById).not.toHaveBeenCalled();
  });
});

function aircraftRepository(aircraftList: Aircraft[]): IAircraftRepository & { getById: ReturnType<typeof vi.fn> } {
  return {
    getAll: vi.fn(() => aircraftList),
    getById: vi.fn((id: string) => aircraftList.find((item) => item.id === id)),
    replaceAll: vi.fn((input: Aircraft[]) => input),
    upsert: vi.fn((input: Aircraft) => input),
    upsertMany: vi.fn((input: Aircraft[]) => input)
  };
}

function aircraftAnalytics(): IAircraftAnalyticsService {
  return {
    calculate: vi.fn(
      (): AircraftMetrics => ({
        averageGroundSpeedKt: 0,
        liveAircraft: 0,
        militaryAircraft: 0,
        emergencyAircraft: 0,
        averageAltitudeFt: 0,
        trackedAircraft: 0,
        dataLatencyMs: 0,
        lastUpdated: timestamp
      })
    )
  };
}

function vesselRepository(vesselList: Vessel[]): IVesselRepository & { getById: ReturnType<typeof vi.fn> } {
  return {
    getAll: vi.fn(() => vesselList),
    getById: vi.fn((id: string) => vesselList.find((item) => item.id === id)),
    upsert: vi.fn((input: Vessel) => input)
  };
}

function vesselAnalytics(): IVesselAnalyticsService {
  return {
    calculate: vi.fn(
      (): VesselMetrics => ({
        averageSpeed: 0,
        highRiskVessels: 0,
        liveVessels: 0,
        trackedVessels: 0,
        dataLatencyMs: 0,
        lastUpdated: timestamp
      })
    )
  };
}

function airportContextResponse(): AirportContextResponse {
  return {
    status: "ok",
    mode: "mock",
    source: {
      title: "OurAirports open airport data",
      url: "https://ourairports.com/data/",
      attribution: "Airport and runway open data by OurAirports"
    },
    generatedAt: timestamp,
    cached: false,
    airports: [],
    summary: {
      count: 0,
      scheduledServiceCount: 0,
      runwayCount: 0
    },
    limitations: ["Test airport context."]
  };
}

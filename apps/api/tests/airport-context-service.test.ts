import { describe, expect, it, vi } from "vitest";
import { AirportContextService } from "../src/context/airport-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T11:00:00.000Z";
const area = { south: 50.68, west: -1.5, north: 51, east: -1 };
const airportsCsv = [
  "id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords",
  "2537,EGHI,medium_airport,Southampton Airport,50.9503,-1.3568,44,EU,GB,GB-ENG,Southampton,yes,EGHI,SOU,,,https://en.wikipedia.org/wiki/Southampton_Airport,",
  "2538,EGHF,small_airport,Lee-on-Solent Airport,50.815,-1.207,32,EU,GB,GB-ENG,Lee-on-Solent,no,EGHF,,,,,",
  "2434,EGLL,large_airport,London Heathrow Airport,51.4706,-0.461941,83,EU,GB,GB-ENG,London,yes,EGLL,LHR,,,https://en.wikipedia.org/wiki/Heathrow_Airport,"
].join("\n");
const runwaysCsv = [
  "id,airport_ref,airport_ident,length_ft,width_ft,surface,lighted,closed,le_ident,le_latitude_deg,le_longitude_deg,le_elevation_ft,le_heading_degT,le_displaced_threshold_ft,he_ident,he_latitude_deg,he_longitude_deg,he_elevation_ft,he_heading_degT,he_displaced_threshold_ft",
  "1,2537,EGHI,5653,121,ASP,1,0,02,50.943,-1.361,44,21,,20,50.958,-1.352,44,201,",
  "2,2538,EGHF,3480,100,ASP,0,0,05,50.811,-1.214,32,45,,23,50.821,-1.199,31,225,",
  "4,2538,EGHF,9900,150,ASP,1,1,01,50.811,-1.214,32,10,,19,50.821,-1.199,31,190,",
  "3,2434,EGLL,12799,164,ASP,1,0,09L,51.477,-0.489,83,90,,27R,51.477,-0.434,83,270,"
].join("\n");

describe("airport context service", () => {
  it("downloads fixed OurAirports CSV files and returns area airports with runways", async () => {
    const fetchMock = createAirportFetch();
    const service = new AirportContextService(
      config(),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const first = await service.getAreaAirports(area);
    const second = await service.getAreaAirports(area);
    const requestedUrls = fetchMock.mock.calls.map((call) => String(call[0]));

    expect(first).toMatchObject({
      status: "ok",
      mode: "live",
      cached: false,
      area,
      summary: {
        count: 2,
        scheduledServiceCount: 1,
        runwayCount: 2
      }
    });
    expect(first.airports[0]).toMatchObject({
      ident: "EGHF",
      name: "Lee-on-Solent Airport",
      type: "small_airport",
      runways: [
        {
          lengthFt: 3480,
          lowEnd: { ident: "05", headingDegrees: 45 },
          highEnd: { ident: "23", headingDegrees: 225 }
        }
      ]
    });
    expect(first.airports[0]?.runways.some((runway) => runway.lengthFt === 9900)).toBe(false);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrls).toContain("https://davidmegginson.github.io/ourairports-data/airports.csv");
    expect(requestedUrls).toContain("https://davidmegginson.github.io/ourairports-data/runways.csv");
  });

  it("returns nearest airports for a selected aircraft focus", async () => {
    const service = new AirportContextService(
      config(),
      createAirportFetch() as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getNearbyAirports({
      latitude: 50.82,
      longitude: -1.21,
      aircraftId: "icao24-407abc",
      label: "RFR7182",
      radiusKm: 80
    });

    expect(result.focus).toMatchObject({ aircraftId: "icao24-407abc", label: "RFR7182" });
    expect(result.airports[0]?.ident).toBe("EGHF");
    expect(result.airports[0]?.distanceKm).toBeLessThan(2);
  });

  it("falls back to nearest airports when no airport is inside the selected area", async () => {
    const service = new AirportContextService(
      config(),
      createAirportFetch() as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaAirports({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.status).toBe("ok");
    expect(result.airports).toHaveLength(3);
    expect(result.limitations[0]).toContain("No airports were inside");
  });

  it("returns not-configured when airport context is disabled", async () => {
    const fetchMock = vi.fn();
    const service = new AirportContextService(
      config({ airportContextMode: "off" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaAirports(area);

    expect(result.status).toBe("not_configured");
    expect(result.limitations[0]).toContain("AIRPORT_CONTEXT_MODE=live");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized OurAirports CSV responses before parsing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("airports.csv")) {
        return new Response("", { status: 200, headers: { "content-length": "20000001" } });
      }
      return new Response(runwaysCsv, { status: 200 });
    });
    const service = new AirportContextService(
      config(),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaAirports(area);

    expect(result.status).toBe("error");
    expect(result.error).toBe("OurAirports airports.csv exceeded size limit.");
  });

  it("cancels streaming OurAirports CSV responses once the byte cap is crossed", async () => {
    let chunksPulled = 0;
    let cancelled = false;
    const oversizedAirportsBody = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksPulled += 1;
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel() {
        cancelled = true;
      }
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("airports.csv")) {
        return new Response(oversizedAirportsBody, { status: 200 });
      }
      return new Response(runwaysCsv, { status: 200 });
    });
    const service = new AirportContextService(
      config(),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaAirports(area);

    expect(result.status).toBe("error");
    expect(result.error).toBe("OurAirports airports.csv exceeded size limit.");
    expect(cancelled).toBe(true);
    expect(chunksPulled).toBeLessThan(25);
  });
});

function createAirportFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("airports.csv")) {
      return new Response(airportsCsv, { status: 200 });
    }

    return new Response(runwaysCsv, { status: 200 });
  });
}

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: "test",
    host: "127.0.0.1",
    port: 0,
    trustProxy: false,
    corsOrigins: ["http://localhost:5173"],
    aisMode: "mock",
    mockStreamIntervalMs: 1000,
    aisstreamUrl: "wss://stream.aisstream.io/v0/stream",
    aisstreamBoundingBoxes: [[[-90, -180], [90, 180]]],
    aisstreamFilterMMSI: [],
    aisstreamFilterMessageTypes: ["PositionReport"],
    aisstreamReconnectBaseMs: 1000,
    aisstreamReconnectMaxMs: 30000,
    aisstreamHeartbeatMs: 30000,
    flightMode: "mock",
    flightProvider: "mock",
    flightBoundingBoxes: [[[-90, -180], [90, 180]]],
    flightPollIntervalMs: 5000,
    flightStaleAfterSeconds: 60,
    flightProviderTimeoutMs: 10000,
    marineWeatherMode: "mock",
    marineWeatherTimeoutMs: 10000,
    marineWeatherCacheSeconds: 900,
    marineWeatherCacheMaxEntries: 200,
    firmsMode: "mock",
    firmsSource: "VIIRS_SNPP_NRT",
    firmsDayRange: 1,
    firmsTimeoutMs: 10000,
    firmsCacheSeconds: 900,
    firmsCacheMaxEntries: 200,
    firmsMaxDetections: 150,
    airportContextMode: "live",
    airportContextTimeoutMs: 10000,
    airportContextCacheSeconds: 86400,
    airportContextMaxResults: 8,
    airportContextMaxRunwaysPerAirport: 4,
  airspaceContextMode: "off",
  airspaceContextMaxResults: 25,
  flightRouteContextMode: "off",
  flightRouteContextProvider: "flightaware",
  flightRouteContextMaxWaypoints: 60,
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

import { describe, expect, it } from "vitest";
import { SatelliteContextService } from "../src/context/satellite-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T12:00:00.000Z";
const area = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };

describe("satellite context service", () => {
  it("returns a live NASA GIBS snapshot URL by default", async () => {
    const service = new SatelliteContextService(config(), () => new Date(generatedAt));

    const result = await service.getAreaSnapshot(area);

    expect(result).toMatchObject({
      status: "ok",
      mode: "live",
      provider: "nasa-gibs",
      area,
      snapshot: {
        layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        acquiredDate: "2026-06-20",
        width: 512,
        height: 512,
        projection: "EPSG:4326"
      }
    });
    expect(result.snapshot?.imageUrl).toBeDefined();
    const imageUrl = new URL(result.snapshot!.imageUrl!);
    expect(imageUrl.protocol).toBe("https:");
    expect(imageUrl.host).toBe("gibs.earthdata.nasa.gov");
    expect(imageUrl.pathname).toBe("/wms/epsg4326/best/wms.cgi");
    expect(imageUrl.searchParams.get("SERVICE")).toBe("WMS");
    expect(imageUrl.searchParams.get("VERSION")).toBe("1.3.0");
    expect(imageUrl.searchParams.get("REQUEST")).toBe("GetMap");
    expect(imageUrl.searchParams.get("FORMAT")).toBe("image/jpeg");
    expect(imageUrl.searchParams.get("TRANSPARENT")).toBe("false");
    expect(imageUrl.searchParams.get("LAYERS")).toBe("VIIRS_SNPP_CorrectedReflectance_TrueColor");
    expect(imageUrl.searchParams.get("WIDTH")).toBe("512");
    expect(imageUrl.searchParams.get("HEIGHT")).toBe("512");
    expect(imageUrl.searchParams.get("CRS")).toBe("EPSG:4326");
    expect(imageUrl.searchParams.get("BBOX")).toBe("50.68000,-1.28000,50.90000,-0.86000");
    expect(imageUrl.searchParams.get("TIME")).toBe("2026-06-20");
    expect(imageUrl.searchParams.has("api_key")).toBe(false);
  });

  it("keeps mock mode offline by omitting remote imagery URLs", async () => {
    const service = new SatelliteContextService(
      config({ satelliteContextMode: "mock" }),
      () => new Date(generatedAt)
    );

    const result = await service.getAreaSnapshot(area);

    expect(result).toMatchObject({
      status: "ok",
      mode: "mock",
      provider: "mock",
      snapshot: {
        layerId: "mock-satellite-snapshot",
        acquiredDate: "2026-06-20"
      }
    });
    expect(result.snapshot?.imageUrl).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("gibs.earthdata.nasa.gov");
  });

  it("returns not configured when satellite mode is off", async () => {
    const service = new SatelliteContextService(
      config({ satelliteContextMode: "off" }),
      () => new Date(generatedAt)
    );

    const result = await service.getAreaSnapshot(area);

    expect(result.status).toBe("not_configured");
    expect(result.snapshot).toBeUndefined();
    expect(result.error).toContain("not configured");
  });

  it("returns an error state for over-large areas before provider URL construction", async () => {
    const service = new SatelliteContextService(config(), () => new Date(generatedAt));

    const result = await service.getAreaSnapshot({
      south: -30,
      west: -30,
      north: 30,
      east: 30
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Maximum latitude span");
    expect(result.snapshot).toBeUndefined();
  });
});

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
    airportContextMode: "mock",
    airportContextTimeoutMs: 10000,
    airportContextCacheSeconds: 86400,
    airportContextMaxResults: 8,
    airportContextMaxRunwaysPerAirport: 4,
    airspaceContextMode: "off",
    airspaceContextMaxResults: 25,
    flightRouteContextMode: "off",
    flightRouteContextProvider: "flightaware",
    flightRouteContextMaxWaypoints: 60,
    sanctionsContextMode: "off",
    sanctionsContextProvider: "opensanctions",
    sanctionsContextMaxResults: 10,
    satelliteContextMode: "live",
    satelliteContextProvider: "nasa-gibs",
    satelliteContextLayer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    satelliteContextDateOffsetDays: 1,
    satelliteContextImageSize: 512,
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

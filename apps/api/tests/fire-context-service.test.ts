import { describe, expect, it, vi } from "vitest";
import { FireContextService } from "../src/context/fire-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T10:00:00.000Z";
const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const csv = [
  "latitude,longitude,bright_ti4,acq_date,acq_time,satellite,instrument,confidence,version,frp,daynight",
  "50.790,-1.040,331.4,2026-06-21,0930,N,VIIRS,n,2.0NRT,18.6,D",
  "50.800,-1.020,341.2,2026-06-21,0945,N,VIIRS,h,2.0NRT,55.1,N"
].join("\n");

describe("fire context service", () => {
  it("normalises live FIRMS CSV detections and caches exact selected bounds", async () => {
    const fetchMock = vi.fn(async () => new Response(csv, { status: 200 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const first = await service.getAreaFires(bounds);
    const second = await service.getAreaFires(bounds);
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(first).toMatchObject({
      status: "ok",
      mode: "live",
      cached: false,
      sourceDataset: "VIIRS_SNPP_NRT",
      summary: {
        count: 2,
        highConfidenceCount: 1,
        nightCount: 1,
        maxFireRadiativePowerMw: 55.1
      },
      risk: {
        level: "high"
      }
    });
    expect(first.detections[0]).toMatchObject({
      confidence: "high",
      acquiredAt: "2026-06-21T09:45:00.000Z",
      dayNight: "night"
    });
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl.hostname).toBe("firms.modaps.eosdis.nasa.gov");
    expect(calledUrl.pathname).toContain("/api/area/csv/test-map-key/VIIRS_SNPP_NRT/");
    expect(JSON.stringify(first)).not.toContain("test-map-key");
  });

  it("reuses bucketed provider data without returning stale selected-area metadata", async () => {
    const fetchMock = vi.fn(async () => new Response(csv, { status: 200 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );
    const alternateBounds = { south: 50.681, west: -1.279, north: 50.899, east: -0.861 };

    const first = await service.getAreaFires(bounds);
    const second = await service.getAreaFires(alternateBounds);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.area).toEqual(bounds);
    expect(second.area).toEqual(alternateBounds);
    expect(second.cached).toBe(true);
  });

  it("splits antimeridian bounds into two fixed-host FIRMS requests", async () => {
    const fetchMock = vi.fn(async () => new Response(csv, { status: 200 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires({ south: -10, west: 170, north: 10, east: -170 });

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("170.0000,-10.0000,180.0000,10.0000");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("-180.0000,-10.0000,-170.0000,10.0000");
  });

  it("returns not-configured when FIRMS live mode has no server map key", async () => {
    const fetchMock = vi.fn();
    const service = new FireContextService(
      config({ firmsMapKey: undefined }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires(bounds);

    expect(result.status).toBe("not_configured");
    expect(result.limitations[0]).toContain("FIRMS_MAP_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns disabled-mode remediation when FIRMS mode is off", async () => {
    const fetchMock = vi.fn();
    const service = new FireContextService(
      config({ firmsMode: "off" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires(bounds);

    expect(result.status).toBe("not_configured");
    expect(result.risk.reasons[0]).toContain("disabled");
    expect(result.limitations[0]).toContain("FIRMS_MODE=live");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error without calling FIRMS when selected bounds are too large", async () => {
    const fetchMock = vi.fn();
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires({ south: -90, west: -180, north: 90, east: 180 });

    expect(result.status).toBe("error");
    expect(result.error).toContain("too tall");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a typed provider error without leaking the map key", async () => {
    const fetchMock = vi.fn(async () => new Response("Forbidden", { status: 403 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires(bounds);

    expect(result).toMatchObject({
      status: "error",
      mode: "live",
      error: "NASA FIRMS returned HTTP 403."
    });
    expect(JSON.stringify(result)).not.toContain("test-map-key");
  });

  it("rejects oversized FIRMS CSV responses before parsing", async () => {
    const fetchMock = vi.fn(async () => new Response("x".repeat(1_000_001), { status: 200 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires(bounds);

    expect(result.status).toBe("error");
    expect(result.error).toBe("NASA FIRMS response exceeded size limit.");
  });

  it("caps provider rows before normalising dense CSV responses", async () => {
    const denseCsv = [
      "latitude,longitude,bright_ti4,acq_date,acq_time,satellite,instrument,confidence,version,frp,daynight",
      ...Array.from({ length: 2050 }, (_, index) =>
        `50.79,-1.04,331.4,2026-06-21,${String(index % 2400).padStart(4, "0")},N,VIIRS,n,2.0NRT,18.6,D`
      )
    ].join("\n");
    const fetchMock = vi.fn(async () => new Response(denseCsv, { status: 200 }));
    const service = new FireContextService(
      config({ firmsMapKey: "test-map-key" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaFires(bounds);

    expect(result.status).toBe("ok");
    expect(result.detections).toHaveLength(150);
    expect(result.limitations.join(" ")).toContain("Provider rows were capped");
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
    firmsMode: "live",
    firmsMapKey: "test-map-key",
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
    analysisMode: "mock",
    openaiModel: "gpt-5.4-mini",
    openaiTimeoutMs: 20000,
    rateLimitMax: 100,
    rateLimitWindow: "1 minute",
    logLevel: "error",
    ...overrides
  };
}

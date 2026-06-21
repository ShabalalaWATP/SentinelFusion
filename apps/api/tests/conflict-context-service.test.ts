import { describe, expect, it, vi } from "vitest";
import { ConflictContextService } from "../src/context/conflict-context-service";
import type { AppConfig } from "../src/config/environment";

const generatedAt = "2026-06-21T10:00:00.000Z";
const bounds = { south: 50.68, west: -1.28, north: 50.9, east: -0.86 };
const acledBody = {
  status: 200,
  data: [
    {
      event_id_cnty: "GBR12345",
      event_date: "2026-06-20",
      disorder_type: "Demonstrations",
      event_type: "Protests",
      sub_event_type: "Peaceful protest",
      country: "United Kingdom",
      admin1: "Portsmouth",
      admin2: "Portsmouth",
      location: "Portsmouth",
      latitude: "50.8058",
      longitude: "-1.0872",
      geo_precision: "1",
      source: "Local media",
      source_scale: "Local",
      notes: "Reported demonstration near the port area.",
      fatalities: "0"
    },
    {
      event_id_cnty: "GBR12346",
      event_date: "2026-06-19",
      disorder_type: "Political violence",
      event_type: "Violence against civilians",
      sub_event_type: "Attack",
      country: "United Kingdom",
      admin1: "Portsmouth",
      location: "Portsmouth Harbour",
      latitude: "50.81",
      longitude: "-1.1",
      geo_precision: "2",
      source: "National media",
      source_scale: "National",
      fatalities: "1"
    }
  ]
};

describe("conflict context service", () => {
  it("normalises live ACLED rows, caches them, and does not expose bearer tokens", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(acledBody));
    const service = new ConflictContextService(
      config({ acledAccessToken: "test-acled-token" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const first = await service.getAreaConflict(bounds);
    const second = await service.getAreaConflict(bounds);
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;

    expect(first).toMatchObject({
      status: "ok",
      mode: "live",
      provider: "acled",
      cached: false,
      summary: {
        count: 2,
        protestCount: 1,
        politicalViolenceCount: 1,
        fatalityCount: 1,
        highSeverityCount: 1
      },
      risk: {
        level: "high"
      }
    });
    expect(first.events[0]).toMatchObject({
      id: "GBR12346",
      eventType: "Violence against civilians",
      severity: "high",
      fatalities: 1
    });
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl.hostname).toBe("acleddata.com");
    expect(calledUrl.pathname).toBe("/api/acled/read");
    expect(calledUrl.searchParams.get("_format")).toBe("json");
    expect(calledUrl.searchParams.get("event_date_where")).toBe("BETWEEN");
    expect(calledUrl.searchParams.get("latitude_where")).toBe("BETWEEN");
    expect(calledUrl.searchParams.get("longitude_where")).toBe("BETWEEN");
    expect(headers.authorization).toBe("Bearer test-acled-token");
    expect(JSON.stringify(first)).not.toContain("test-acled-token");
  });

  it("can request an ACLED OAuth token from server-side credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "oauth-token", expires_in: 86400 }))
      .mockResolvedValueOnce(jsonResponse(acledBody));
    const service = new ConflictContextService(
      config({ acledUsername: "analyst@example.test", acledPassword: "secret-password" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict(bounds);
    const tokenUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const dataHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;

    expect(result.status).toBe("ok");
    expect(tokenUrl.pathname).toBe("/oauth/token");
    expect(dataHeaders.authorization).toBe("Bearer oauth-token");
    expect(JSON.stringify(result)).not.toContain("secret-password");
    expect(JSON.stringify(result)).not.toContain("oauth-token");
  });

  it("returns not configured when live ACLED has no token or credentials", async () => {
    const fetchMock = vi.fn();
    const service = new ConflictContextService(
      config(),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict(bounds);

    expect(result.status).toBe("not_configured");
    expect(result.limitations[0]).toContain("ACLED_ACCESS_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("splits antimeridian bounds into two fixed-host ACLED requests", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(acledBody));
    const service = new ConflictContextService(
      config({ acledAccessToken: "test-acled-token" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict({ south: -10, west: 170, north: 10, east: -170 });

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get("longitude")).toBe(
      "170.0000|180.0000"
    );
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get("longitude")).toBe(
      "-180.0000|-170.0000"
    );
  });

  it("returns an error without calling ACLED when selected bounds are too large", async () => {
    const fetchMock = vi.fn();
    const service = new ConflictContextService(
      config({ acledAccessToken: "test-acled-token" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict({ south: -90, west: -180, north: 90, east: 180 });

    expect(result.status).toBe("error");
    expect(result.error).toContain("too tall");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns typed provider errors without leaking tokens", async () => {
    const fetchMock = vi.fn(async () => new Response("Forbidden", { status: 403 }));
    const service = new ConflictContextService(
      config({ acledAccessToken: "test-acled-token" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict(bounds);

    expect(result.status).toBe("error");
    expect(result.error).toBe("ACLED returned HTTP 403.");
    expect(JSON.stringify(result)).not.toContain("test-acled-token");
  });

  it("rejects oversized ACLED responses before parsing", async () => {
    const fetchMock = vi.fn(async () => new Response("x".repeat(2_000_001), { status: 200 }));
    const service = new ConflictContextService(
      config({ acledAccessToken: "test-acled-token" }),
      fetchMock as unknown as typeof fetch,
      () => new Date(generatedAt)
    );

    const result = await service.getAreaConflict(bounds);

    expect(result.status).toBe("error");
    expect(result.error).toBe("ACLED response exceeded size limit.");
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
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
    conflictContextMode: "live",
    conflictContextProvider: "acled",
    conflictContextLookbackDays: 14,
    conflictContextTimeoutMs: 10000,
    conflictContextCacheSeconds: 900,
    conflictContextCacheMaxEntries: 200,
    conflictContextMaxResults: 50,
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

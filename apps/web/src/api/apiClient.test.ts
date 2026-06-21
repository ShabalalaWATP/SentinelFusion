import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrafficAreaBounds } from "@aisstream/shared";
import { createApiClient } from "./apiClient";
import { useAnalysisAccessStore } from "../stores/analysisAccessStore";

const timestamp = "2026-06-21T10:00:00.000Z";

const bounds: TrafficAreaBounds = {
  south: 50.68,
  west: -1.28,
  north: 50.9,
  east: -0.86
};

describe("apiClient", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAnalysisAccessStore.getState().clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the analysis bearer token only to protected requests", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.includes("/context/conflict-events")
        ? conflictResponse()
        : { status: "ok", mode: "live", timestamp: new Date().toISOString() };

      return {
        ok: true,
        json: async () => body
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    useAnalysisAccessStore.getState().setToken("test-token");
    const client = createApiClient("http://localhost:4000");

    await client.getConflictContext(bounds);
    await client.getHealth();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/context/conflict-events?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          accept: "application/json"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/health",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String) as string
        })
      })
    );
  });

  it("builds encoded routes and query strings for every context endpoint", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      return {
        ok: true,
        json: async () => responseForUrl(url)
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://localhost:4000");

    await client.getVessels();
    await client.getAircraft();
    await client.getStreamStatus();
    await client.getFlightStatus();
    await client.getAirportContext(bounds);
    await client.getAircraftAirportContext("icao24/43 c6f1");
    await client.getMarineWeather(bounds);
    await client.getFireContext(bounds);
    await client.getSatelliteContext(bounds);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual([
      "http://localhost:4000/vessels",
      "http://localhost:4000/aircraft",
      "http://localhost:4000/stream/status",
      "http://localhost:4000/flight/status",
      "http://localhost:4000/context/airports?south=50.68&west=-1.28&north=50.9&east=-0.86",
      "http://localhost:4000/aircraft/icao24%2F43%20c6f1/airport-context",
      "http://localhost:4000/context/marine-weather?south=50.68&west=-1.28&north=50.9&east=-0.86",
      "http://localhost:4000/context/fire-anomalies?south=50.68&west=-1.28&north=50.9&east=-0.86",
      "http://localhost:4000/context/satellite-snapshot?south=50.68&west=-1.28&north=50.9&east=-0.86"
    ]);
  });

  it("posts protected analysis and entity intel requests with JSON bodies", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      return {
        ok: true,
        json: async () => responseForUrl(url)
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    useAnalysisAccessStore.getState().setToken("analysis-token");

    const client = createApiClient("http://localhost:4000");

    await client.analyse({
      question: "How many vessels are in Portsmouth?",
      domain: "all",
      areaBounds: bounds
    });
    await client.getVesselIntel("mmsi/232001234");
    await client.getAircraftIntel("icao24/43c6f1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/analysis",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer analysis-token",
          "content-type": "application/json"
        }),
        body: JSON.stringify({
          question: "How many vessels are in Portsmouth?",
          domain: "all",
          areaBounds: bounds
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/vessels/mmsi%2F232001234/intel",
      expect.objectContaining({
        method: "POST",
        body: "{}"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/aircraft/icao24%2F43c6f1/intel",
      expect.objectContaining({
        method: "POST",
        body: "{}"
      })
    );
  });

  it("rejects HTTP failures, invalid server payloads, and invalid analysis input", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 503,
        json: async () => ({ status: "ok" })
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://localhost:4000");
    await expect(client.getHealth()).rejects.toThrow("API request failed with status 503");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({ status: "wrong" })
        } as Response;
      })
    );
    await expect(client.getHealth()).rejects.toThrow();
    expect(() => client.analyse({ question: "", domain: "all" })).toThrow();
  });
});

function conflictResponse() {
  return {
    status: "ok",
    mode: "live",
    provider: "acled",
    source: {
      title: "ACLED conflict events",
      url: "https://acleddata.com",
      attribution: "ACLED"
    },
    generatedAt: new Date().toISOString(),
    cached: false,
    area: bounds,
    lookbackDays: 14,
    events: [],
    summary: {
      count: 0,
      protestCount: 0,
      riotCount: 0,
      politicalViolenceCount: 0,
      fatalityCount: 0,
      highSeverityCount: 0
    },
    risk: {
      level: "low",
      reasons: ["No recent ACLED events were found in the selected area."]
    },
    limitations: ["ACLED coverage depends on source reporting and publication cadence."]
  };
}

function responseForUrl(url: string): unknown {
  if (url.endsWith("/health")) {
    return healthResponse();
  }

  if (url.endsWith("/vessels")) {
    return {
      vessels: [vessel()],
      metrics: vesselMetrics(),
      stream: streamStatus()
    };
  }

  if (url.endsWith("/aircraft")) {
    return {
      aircraft: [aircraft()],
      metrics: aircraftMetrics(),
      stream: flightStatus()
    };
  }

  if (url.endsWith("/stream/status")) {
    return streamStatus();
  }

  if (url.endsWith("/flight/status")) {
    return flightStatus();
  }

  if (url.includes("/context/airports?") || url.includes("/airport-context")) {
    return airportContextResponse();
  }

  if (url.includes("/context/conflict-events?")) {
    return conflictResponse();
  }

  if (url.includes("/context/marine-weather?")) {
    return marineWeatherResponse();
  }

  if (url.includes("/context/fire-anomalies?")) {
    return fireContextResponse();
  }

  if (url.includes("/context/satellite-snapshot?")) {
    return satelliteContextResponse();
  }

  if (url.endsWith("/analysis")) {
    return analysisResponse();
  }

  if (url.includes("/vessels/") && url.endsWith("/intel")) {
    return vesselIntelResponse();
  }

  if (url.includes("/aircraft/") && url.endsWith("/intel")) {
    return aircraftIntelResponse();
  }

  throw new Error(`Unexpected URL ${url}`);
}

function healthResponse() {
  return {
    status: "ok",
    mode: "live",
    timestamp
  };
}

function vessel() {
  return {
    id: "mmsi-232001234",
    mmsi: "232001234",
    name: "NORTHERN LIGHT",
    shipType: "Cargo",
    longitude: -1.1,
    latitude: 50.8,
    speedOverGround: 12.5,
    courseOverGround: 86,
    destination: "Portsmouth",
    navigationalStatus: "Under way using engine",
    riskLevel: "low",
    lastUpdated: timestamp,
    track: [{ longitude: -1.1, latitude: 50.8, timestamp }]
  };
}

function vesselMetrics() {
  return {
    liveVessels: 1,
    trackedVessels: 1,
    highRiskVessels: 0,
    averageSpeed: 12.5,
    dataLatencyMs: 100,
    lastUpdated: timestamp
  };
}

function streamStatus() {
  return {
    mode: "live",
    state: "subscribed",
    connected: true,
    messagesReceived: 10,
    messagesNormalised: 9,
    messagesDropped: 1,
    errors: 0,
    reconnectAttempts: 0,
    lastMessageAt: timestamp,
    dataLatencyMs: 100,
    subscription: {
      boundingBoxes: [[[-90, -180], [90, 180]]],
      filtersShipMMSI: [],
      filterMessageTypes: ["PositionReport"]
    }
  };
}

function aircraft() {
  return {
    id: "icao24-43c6f1",
    icao24: "43c6f1",
    callsign: "RFR7182",
    registration: "ZZ343",
    aircraftType: "Airbus A400M Atlas",
    operator: "Royal Air Force",
    originCountry: "United Kingdom",
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
    source: "opensky",
    lastUpdated: timestamp,
    track: [{ longitude: -1.1, latitude: 50.8, altitudeFt: 18000, timestamp }]
  };
}

function aircraftMetrics() {
  return {
    liveAircraft: 1,
    trackedAircraft: 1,
    militaryAircraft: 1,
    emergencyAircraft: 0,
    averageAltitudeFt: 18000,
    averageGroundSpeedKt: 310,
    dataLatencyMs: 120,
    lastUpdated: timestamp
  };
}

function flightStatus() {
  return {
    mode: "live",
    provider: "opensky",
    state: "subscribed",
    connected: true,
    aircraftReceived: 10,
    aircraftNormalised: 9,
    aircraftDropped: 1,
    errors: 0,
    reconnectAttempts: 0,
    lastMessageAt: timestamp,
    dataLatencyMs: 100,
    subscription: {
      boundingBoxes: [[[-90, -180], [90, 180]]]
    }
  };
}

function airportContextResponse() {
  return {
    status: "ok",
    mode: "live",
    source: {
      title: "OurAirports",
      url: "https://ourairports.com",
      attribution: "OurAirports"
    },
    generatedAt: timestamp,
    cached: false,
    area: bounds,
    airports: [],
    summary: {
      count: 0,
      scheduledServiceCount: 0,
      runwayCount: 0
    },
    limitations: ["Airport context depends on public airport data."]
  };
}

function marineWeatherResponse() {
  return {
    status: "ok",
    mode: "live",
    source: {
      title: "Open-Meteo Marine",
      url: "https://marine-api.open-meteo.com",
      attribution: "Open-Meteo"
    },
    generatedAt: timestamp,
    cached: false,
    area: bounds,
    location: {
      latitude: 50.79,
      longitude: -1.04,
      label: "Portsmouth"
    },
    forecast: [],
    risk: {
      level: "low",
      reasons: ["No adverse marine conditions were reported."]
    },
    limitations: ["Marine weather is modelled forecast data."]
  };
}

function fireContextResponse() {
  return {
    status: "ok",
    mode: "live",
    source: {
      title: "NASA FIRMS Active Fire",
      url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
      attribution: "NASA FIRMS"
    },
    generatedAt: timestamp,
    cached: false,
    area: bounds,
    sourceDataset: "VIIRS_SNPP_NRT",
    dayRange: 1,
    detections: [],
    summary: {
      count: 0,
      highConfidenceCount: 0,
      dayCount: 0,
      nightCount: 0
    },
    risk: {
      level: "low",
      reasons: ["No active fire points were found."]
    },
    limitations: ["FIRMS detections are satellite thermal anomalies."]
  };
}

function satelliteContextResponse() {
  return {
    status: "ok",
    mode: "live",
    provider: "nasa-gibs",
    source: {
      title: "NASA GIBS",
      url: "https://gibs.earthdata.nasa.gov",
      attribution: "NASA GIBS"
    },
    generatedAt: timestamp,
    cached: false,
    area: bounds,
    limitations: ["Satellite context depends on imagery availability."]
  };
}

function analysisResponse() {
  return {
    status: "ok",
    mode: "live",
    model: "test-model",
    summary: "There is one vessel in the requested area.",
    riskLevel: "low",
    keyFindings: ["One vessel is present."],
    recommendedActions: ["Continue monitoring."],
    evidence: ["The live snapshot contains one vessel."],
    limitations: ["Live feeds can be incomplete."],
    generatedAt: timestamp
  };
}

function vesselIntelResponse() {
  return {
    status: "ok",
    mode: "live",
    model: "test-model",
    vesselId: "mmsi-232001234",
    summary: "Public records identify the vessel.",
    facts: ["MMSI 232001234 is present in a public registry."],
    sources: [{ title: "Registry", url: "https://example.com/vessel" }],
    limitations: ["Registry information may lag AIS traffic."],
    generatedAt: timestamp
  };
}

function aircraftIntelResponse() {
  return {
    status: "ok",
    mode: "live",
    model: "test-model",
    aircraftId: "icao24-43c6f1",
    summary: "Public records identify the aircraft.",
    facts: ["ICAO 43c6f1 is present in a public registry."],
    sources: [{ title: "Registry", url: "https://example.com/aircraft" }],
    limitations: ["Registry information may lag ADS-B traffic."],
    generatedAt: timestamp
  };
}

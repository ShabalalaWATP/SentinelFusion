import type { Aircraft, FiledRouteContextResponse } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";

type FlightRouteMode = FiledRouteContextResponse["mode"];

export function filedRouteProviderSource(
  provider: AppConfig["flightRouteContextProvider"]
): FiledRouteContextResponse["source"] {
  if (provider === "fr24") {
    return {
      title: "Flightradar24 API",
      url: "https://fr24api.flightradar24.com/docs/getting-started",
      attribution: "Filed route and flight-plan enrichment requires licensed Flightradar24 API access"
    };
  }

  if (provider === "custom") {
    return {
      title: "Licensed filed-route provider",
      url: "https://www.flightaware.com/aeroapi/portal/documentation",
      attribution: "Filed route enrichment requires a licensed server-side provider adapter"
    };
  }

  return {
    title: "FlightAware AeroAPI",
    url: "https://www.flightaware.com/aeroapi/portal/documentation",
    attribution: "Filed route and flight-plan enrichment requires licensed FlightAware AeroAPI access"
  };
}

export function notConfiguredFiledRouteContext(
  generatedAt: string,
  mode: FlightRouteMode,
  provider: AppConfig["flightRouteContextProvider"],
  aircraft: Aircraft
): FiledRouteContextResponse {
  return {
    status: "not_configured",
    mode,
    provider,
    source: filedRouteProviderSource(provider),
    generatedAt,
    cached: false,
    aircraft: aircraftIdentity(aircraft),
    limitations: [
      "Filed route enrichment is not configured. Use a licensed FlightAware, Flightradar24, or equivalent provider adapter before presenting planned route data as live.",
      "Observed tracks in this dashboard are reconstructed from received position updates and are separate from filed flight plans."
    ],
    error: "Licensed filed-route provider is not configured."
  };
}

export function providerErrorFiledRouteContext(
  generatedAt: string,
  mode: FlightRouteMode,
  provider: AppConfig["flightRouteContextProvider"],
  aircraft: Aircraft,
  error: string
): FiledRouteContextResponse {
  return {
    status: "error",
    mode,
    provider,
    source: filedRouteProviderSource(provider),
    generatedAt,
    cached: false,
    aircraft: aircraftIdentity(aircraft),
    limitations: ["Filed route context is unavailable for this aircraft."],
    error
  };
}

export function mockFiledRouteContext(
  generatedAt: string,
  aircraft: Aircraft,
  maxWaypoints: number
): FiledRouteContextResponse {
  const departure = addMinutes(generatedAt, -20);
  const arrival = addMinutes(generatedAt, 70);
  const routeText = buildMockRouteText(aircraft);
  const waypoints = [
    { sequence: 0, ident: aircraft.originAirport ?? "EGLL", latitude: 51.47, longitude: -0.45 },
    { sequence: 1, ident: "CPT" },
    { sequence: 2, ident: "SAM" },
    { sequence: 3, ident: aircraft.destinationAirport ?? "EGJJ", latitude: 49.21, longitude: -2.2 }
  ].slice(0, maxWaypoints);

  return {
    status: "ok",
    mode: "mock",
    provider: "mock",
    source: {
      title: "Mock filed route",
      url: "https://www.flightaware.com/aeroapi/portal/documentation",
      attribution: "Mock filed route context for local development"
    },
    generatedAt,
    cached: false,
    aircraft: aircraftIdentity(aircraft),
    route: {
      callsign: aircraft.callsign,
      originAirport: aircraft.originAirport ?? "EGLL",
      destinationAirport: aircraft.destinationAirport ?? "EGJJ",
      scheduledDeparture: departure,
      scheduledArrival: arrival,
      estimatedDeparture: departure,
      estimatedArrival: arrival,
      routeText,
      waypoints,
      confidence: "low",
      status: "planned"
    },
    limitations: [
      "Mock filed routes are for offline UI development only and are not live filed flight-plan data."
    ]
  };
}

function aircraftIdentity(aircraft: Aircraft): FiledRouteContextResponse["aircraft"] {
  return {
    aircraftId: aircraft.id,
    icao24: aircraft.icao24,
    ...(aircraft.callsign ? { callsign: aircraft.callsign } : {}),
    ...(aircraft.registration ? { registration: aircraft.registration } : {})
  };
}

function buildMockRouteText(aircraft: Aircraft): string {
  const origin = aircraft.originAirport ?? "EGLL";
  const destination = aircraft.destinationAirport ?? "EGJJ";
  return `${origin} CPT SAM ${destination}`;
}

function addMinutes(value: string, minutes: number): string {
  const date = new Date(value);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}

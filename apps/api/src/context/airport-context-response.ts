import type { AirportContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { GeoPoint } from "./airport-context-limits";

const source: AirportContextResponse["source"] = {
  title: "OurAirports open airport data",
  url: "https://ourairports.com/data/",
  attribution: "Airport and runway open data by OurAirports"
};

type BuildResponseArgs = {
  area?: TrafficAreaBounds;
  cached: boolean;
  focus: AirportContextResponse["focus"];
  generatedAt: string;
  airports: AirportContextResponse["airports"];
  mode?: "live" | "mock";
  airportsTruncated?: boolean;
  runwaysTruncated?: boolean;
  fallbackReason?: string;
};

export function toAirportContextResponse(args: BuildResponseArgs): AirportContextResponse {
  const runwayLengths = args.airports.flatMap((airport) =>
    airport.runways.map((runway) => runway.lengthFt).filter((value): value is number => value !== undefined)
  );
  const nearestDistanceKm = args.airports[0]?.distanceKm;
  const longestRunwayFt =
    runwayLengths.length > 0 ? Math.max(...runwayLengths) : undefined;

  return {
    status: "ok",
    mode: args.mode ?? "live",
    source,
    generatedAt: args.generatedAt,
    cached: args.cached,
    ...(args.area ? { area: args.area } : {}),
    ...(args.focus ? { focus: args.focus } : {}),
    airports: args.airports,
    summary: {
      count: args.airports.length,
      scheduledServiceCount: args.airports.filter((airport) => airport.scheduledService).length,
      runwayCount: args.airports.reduce((total, airport) => total + airport.runways.length, 0),
      ...(nearestDistanceKm === undefined ? {} : { nearestDistanceKm }),
      ...(longestRunwayFt === undefined ? {} : { longestRunwayFt })
    },
    limitations: airportLimitations(args)
  };
}

export function notConfiguredAirportContext(
  generatedAt: string,
  options: { area?: TrafficAreaBounds; focus?: AirportContextResponse["focus"]; reason?: string } = {}
): AirportContextResponse {
  const reason = options.reason ?? "Airport/runway context is disabled.";

  return {
    status: "not_configured",
    mode: "live",
    source,
    generatedAt,
    cached: false,
    ...(options.area ? { area: options.area } : {}),
    ...(options.focus ? { focus: options.focus } : {}),
    airports: [],
    summary: {
      count: 0,
      scheduledServiceCount: 0,
      runwayCount: 0
    },
    limitations: ["Set AIRPORT_CONTEXT_MODE=live on the API server to enable open airport data."],
    error: reason
  };
}

export function providerErrorAirportContext(
  generatedAt: string,
  error: string,
  options: { area?: TrafficAreaBounds; focus?: AirportContextResponse["focus"] } = {}
): AirportContextResponse {
  return {
    status: "error",
    mode: "live",
    source,
    generatedAt,
    cached: false,
    ...(options.area ? { area: options.area } : {}),
    ...(options.focus ? { focus: options.focus } : {}),
    airports: [],
    summary: {
      count: 0,
      scheduledServiceCount: 0,
      runwayCount: 0
    },
    limitations: ["Airport/runway context could not be refreshed from OurAirports."],
    error
  };
}

export function mockAirportContext(
  generatedAt: string,
  options: { area?: TrafficAreaBounds; focus?: GeoPoint } = {}
): AirportContextResponse {
  const focus = options.focus ?? { latitude: 50.79, longitude: -1.04 };

  return toAirportContextResponse({
    ...(options.area ? { area: options.area } : {}),
    cached: false,
    focus: { ...focus, label: "Mock airport context" },
    generatedAt,
    mode: "mock",
    airports: [
      {
        id: "2537",
        ident: "EGHI",
        type: "medium_airport",
        name: "Southampton Airport",
        latitude: 50.9503,
        longitude: -1.3568,
        elevationFt: 44,
        isoCountry: "GB",
        municipality: "Southampton",
        scheduledService: true,
        gpsCode: "EGHI",
        icaoCode: "EGHI",
        iataCode: "SOU",
        sourceUrl: "https://ourairports.com/airports/EGHI/",
        distanceKm: 29.2,
        bearingDegrees: 309,
        runways: [
          {
            id: "mock-eghi-02-20",
            lengthFt: 5653,
            widthFt: 121,
            surface: "ASP",
            lighted: true,
            closed: false,
            lowEnd: { ident: "02", headingDegrees: 21 },
            highEnd: { ident: "20", headingDegrees: 201 }
          }
        ]
      }
    ],
    fallbackReason: "Mock airport context is for offline development only."
  });
}

function airportLimitations(args: BuildResponseArgs): string[] {
  const limitations = [
    "OurAirports is public-domain community data and is not authoritative aeronautical information.",
    "Closed airports and closed runways are excluded; runway details may be incomplete or stale."
  ];

  if (args.fallbackReason) {
    limitations.unshift(args.fallbackReason);
  }

  if (args.airportsTruncated) {
    limitations.push("Airport provider rows were capped before processing.");
  }

  if (args.runwaysTruncated) {
    limitations.push("Runway provider rows were capped before processing.");
  }

  return limitations.slice(0, 6);
}

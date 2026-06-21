import type { AirspaceContextResponse, TrafficAreaBounds } from "@aisstream/shared";

export const airspaceProviderSource: AirspaceContextResponse["source"] = {
  title: "Authorised NOTAM/TFR provider",
  url: "https://www.faa.gov/air_traffic/technology/swim",
  attribution: "NOTAM, TFR and airspace restriction data requires authorised FAA/SWIM or licensed provider access"
};

export function notConfiguredAirspaceContext(
  generatedAt: string,
  mode: AirspaceContextResponse["mode"],
  area: TrafficAreaBounds
): AirspaceContextResponse {
  return {
    status: "not_configured",
    mode,
    source: airspaceProviderSource,
    generatedAt,
    cached: false,
    area,
    notices: [],
    summary: emptySummary(),
    limitations: [
      "Live NOTAM/TFR access is not configured. Use an authorised FAA/SWIM or licensed provider adapter before presenting this as live operational airspace data.",
      "Do not scrape consumer NOTAM or flight-planning websites for this dashboard."
    ],
    error: "Authorised airspace notice provider is not configured."
  };
}

export function providerErrorAirspaceContext(
  generatedAt: string,
  mode: AirspaceContextResponse["mode"],
  area: TrafficAreaBounds,
  error: string
): AirspaceContextResponse {
  return {
    status: "error",
    mode,
    source: airspaceProviderSource,
    generatedAt,
    cached: false,
    area,
    notices: [],
    summary: emptySummary(),
    limitations: ["Airspace notice context is unavailable for this area."],
    error
  };
}

export function mockAirspaceContext(
  generatedAt: string,
  area: TrafficAreaBounds,
  maxResults: number
): AirspaceContextResponse {
  const activeEnd = addHours(generatedAt, 2);
  const upcomingStart = addHours(generatedAt, 1);
  const upcomingEnd = addHours(generatedAt, 4);
  const availableNotices: AirspaceContextResponse["notices"] = [
    {
      id: "mock-airspace-training-area",
      type: "restricted_area",
      status: "active",
      severity: "medium",
      title: "Mock restricted training area",
      description:
        "Mock airspace notice for local development. Replace with authorised NOTAM/TFR provider data before operational use.",
      startsAt: generatedAt,
      endsAt: activeEnd,
      bounds: area
    },
    {
      id: "mock-airspace-temporary-flight-restriction",
      type: "tfr",
      status: "upcoming",
      severity: "high",
      title: "Mock temporary flight restriction",
      description:
        "Mock TFR used to validate UI handling for upcoming restricted airspace notices.",
      startsAt: upcomingStart,
      endsAt: upcomingEnd,
      bounds: area
    }
  ];
  const notices = availableNotices.slice(0, maxResults);

  return {
    status: "ok",
    mode: "mock",
    source: {
      ...airspaceProviderSource,
      title: "Mock airspace notices"
    },
    generatedAt,
    cached: false,
    area,
    notices,
    summary: summariseNotices(notices),
    limitations: [
      "Mock airspace notices are for offline development only and are not live NOTAM, TFR or airspace restriction data."
    ]
  };
}

function summariseNotices(
  notices: AirspaceContextResponse["notices"]
): AirspaceContextResponse["summary"] {
  return {
    count: notices.length,
    activeCount: notices.filter((notice) => notice.status === "active").length,
    upcomingCount: notices.filter((notice) => notice.status === "upcoming").length,
    highSeverityCount: notices.filter((notice) => notice.severity === "high").length
  };
}

function emptySummary(): AirspaceContextResponse["summary"] {
  return {
    count: 0,
    activeCount: 0,
    upcomingCount: 0,
    highSeverityCount: 0
  };
}

function addHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

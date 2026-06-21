import type { ConflictContextResponse, RiskLevel, TrafficAreaBounds } from "@aisstream/shared";

export const acledProviderSource: ConflictContextResponse["source"] = {
  title: "ACLED conflict and protest events",
  url: "https://acleddata.com/api-documentation/acled-endpoint",
  attribution: "Conflict and protest data by ACLED"
};

export function toConflictContextResponse({
  area,
  cached,
  events,
  generatedAt,
  lookbackDays,
  maxResults,
  providerRows,
  truncated
}: {
  area: TrafficAreaBounds;
  cached: boolean;
  events: ConflictContextResponse["events"];
  generatedAt: string;
  lookbackDays: number;
  maxResults: number;
  providerRows: number;
  truncated: boolean;
}): ConflictContextResponse {
  const cappedEvents = events.sort(compareEvents).slice(0, maxResults);

  return {
    status: "ok",
    mode: "live",
    provider: "acled",
    source: acledProviderSource,
    generatedAt,
    cached,
    area,
    lookbackDays,
    events: cappedEvents,
    summary: summarise(cappedEvents),
    risk: assessRisk(cappedEvents),
    limitations: buildLimitations(providerRows, cappedEvents.length, truncated)
  };
}

export function notConfiguredConflictContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  mode: ConflictContextResponse["mode"],
  lookbackDays: number,
  options: { limitation?: string; reason?: string } = {}
): ConflictContextResponse {
  return {
    status: "not_configured",
    mode,
    provider: "acled",
    source: acledProviderSource,
    generatedAt,
    cached: false,
    area,
    lookbackDays,
    events: [],
    summary: emptySummary(),
    risk: {
      level: "low",
      reasons: [options.reason ?? "Conflict and protest provider access is not configured."]
    },
    limitations: [
      options.limitation ??
        "Set ACLED_ACCESS_TOKEN, or ACLED_USERNAME and ACLED_PASSWORD, on the API server to enable live conflict and protest events."
    ],
    error: "Conflict and protest provider is not configured."
  };
}

export function mockConflictContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  lookbackDays: number,
  maxResults: number
): ConflictContextResponse {
  const latitude = (area.south + area.north) / 2;
  const longitude = area.west <= area.east ? (area.west + area.east) / 2 : area.west;
  const event: ConflictContextResponse["events"][number] = {
    id: `mock-conflict-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
    eventDate: generatedAt.slice(0, 10),
    eventType: "Protests",
    subEventType: "Peaceful protest",
    disorderType: "Demonstrations",
    location: "Selected area",
    latitude,
    longitude,
    geoPrecision: 1,
    geocodingConfidence: "high",
    fatalities: 0,
    severity: "medium",
    sourceName: "Mock local source",
    sourceScale: "Mock",
    notes: "Mock protest event for offline UI development."
  };
  const events = [
    event
  ].slice(0, maxResults);

  return {
    status: "ok",
    mode: "mock",
    provider: "mock",
    source: {
      ...acledProviderSource,
      title: "Mock conflict and protest events"
    },
    generatedAt,
    cached: false,
    area,
    lookbackDays,
    events,
    summary: summarise(events),
    risk: assessRisk(events),
    limitations: ["Mock conflict and protest events are for offline development only."]
  };
}

export function providerErrorConflictContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  mode: ConflictContextResponse["mode"],
  lookbackDays: number,
  message: string
): ConflictContextResponse {
  return {
    status: "error",
    mode,
    provider: "acled",
    source: acledProviderSource,
    generatedAt,
    cached: false,
    area,
    lookbackDays,
    events: [],
    summary: emptySummary(),
    risk: {
      level: "medium",
      reasons: ["Conflict and protest context is currently unavailable."]
    },
    limitations: ["Retry later or use CONFLICT_CONTEXT_MODE=mock for offline development."],
    error: scrubProviderError(message)
  };
}

function compareEvents(
  left: ConflictContextResponse["events"][number],
  right: ConflictContextResponse["events"][number]
): number {
  const severityDelta = riskRank(right.severity) - riskRank(left.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const fatalityDelta = right.fatalities - left.fatalities;
  if (fatalityDelta !== 0) {
    return fatalityDelta;
  }

  return right.eventDate.localeCompare(left.eventDate);
}

function summarise(events: ConflictContextResponse["events"]): ConflictContextResponse["summary"] {
  const latestEventDate = events.length > 0 ? events.map((event) => event.eventDate).sort().at(-1) : undefined;

  return {
    count: events.length,
    protestCount: events.filter((event) => /protest/i.test(event.eventType)).length,
    riotCount: events.filter((event) => /riot/i.test(event.eventType)).length,
    politicalViolenceCount: events.filter((event) => /battle|explosion|violence/i.test(event.eventType)).length,
    fatalityCount: events.reduce((total, event) => total + event.fatalities, 0),
    highSeverityCount: events.filter((event) => event.severity === "high").length,
    ...(latestEventDate ? { latestEventDate } : {})
  };
}

function assessRisk(events: ConflictContextResponse["events"]): {
  level: RiskLevel;
  reasons: string[];
} {
  if (events.length === 0) {
    return { level: "low", reasons: ["No reported conflict or protest events were returned for this area."] };
  }

  const summary = summarise(events);
  if (summary.highSeverityCount > 0 || summary.fatalityCount > 0) {
    return {
      level: "high",
      reasons: [
        `${events.length} recent events include political violence or reported fatalities.`
      ]
    };
  }

  return {
    level: "medium",
    reasons: [`${events.length} recent conflict or protest events were reported in this area.`]
  };
}

function buildLimitations(providerRows: number, returnedRows: number, truncated: boolean): string[] {
  return [
    "Conflict and protest events are based on reported sources and can lag or miss events.",
    "Locations are geocoded and may represent a town or administrative area rather than an exact incident point.",
    ...(truncated ? ["Provider rows were capped before processing to protect API availability."] : []),
    ...(providerRows > returnedRows
      ? [`Showing the most relevant ${returnedRows} events from ${providerRows} provider rows.`]
      : [])
  ];
}

function emptySummary(): ConflictContextResponse["summary"] {
  return {
    count: 0,
    protestCount: 0,
    riotCount: 0,
    politicalViolenceCount: 0,
    fatalityCount: 0,
    highSeverityCount: 0
  };
}

function riskRank(value: RiskLevel): number {
  return { high: 3, medium: 2, low: 1 }[value];
}

function scrubProviderError(message: string): string {
  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]").slice(0, 260);
}

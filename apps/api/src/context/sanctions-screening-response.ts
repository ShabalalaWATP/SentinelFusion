import type { SanctionsScreeningResponse, Vessel } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";

type SanctionsMode = SanctionsScreeningResponse["mode"];

export function sanctionsProviderSource(
  provider: AppConfig["sanctionsContextProvider"]
): SanctionsScreeningResponse["source"] {
  if (provider === "custom") {
    return {
      title: "Licensed sanctions screening provider",
      url: "https://www.opensanctions.org/docs/api/",
      attribution: "Sanctions and ownership screening requires a licensed server-side provider adapter"
    };
  }

  return {
    title: "OpenSanctions API",
    url: "https://www.opensanctions.org/docs/api/",
    attribution: "Sanctions and ownership screening requires configured OpenSanctions API access"
  };
}

export function notConfiguredSanctionsScreening(
  generatedAt: string,
  mode: SanctionsMode,
  provider: AppConfig["sanctionsContextProvider"],
  vessel: Vessel
): SanctionsScreeningResponse {
  return {
    status: "not_configured",
    mode,
    provider,
    source: sanctionsProviderSource(provider),
    generatedAt,
    cached: false,
    subject: vesselSubject(vessel),
    matches: [],
    summary: emptySummary(),
    limitations: [
      "Sanctions and ownership screening is not configured. Use a licensed provider adapter before presenting screening results.",
      "AIS names and destinations are untrusted search hints. Matches must be reviewed as possible false positives."
    ],
    error: "Sanctions screening provider is not configured."
  };
}

export function providerErrorSanctionsScreening(
  generatedAt: string,
  mode: SanctionsMode,
  provider: AppConfig["sanctionsContextProvider"],
  vessel: Vessel,
  error: string
): SanctionsScreeningResponse {
  return {
    status: "error",
    mode,
    provider,
    source: sanctionsProviderSource(provider),
    generatedAt,
    cached: false,
    subject: vesselSubject(vessel),
    matches: [],
    summary: emptySummary(),
    limitations: ["Sanctions screening context is unavailable for this vessel."],
    error
  };
}

export function mockSanctionsScreening(
  generatedAt: string,
  vessel: Vessel,
  maxResults: number
): SanctionsScreeningResponse {
  const matches = [
    {
      id: `mock-sanctions-${vessel.mmsi}`,
      caption: `${vessel.name} Shipping Ltd`,
      schema: "Company",
      score: 0.72,
      risk: "medium" as const,
      reviewStatus: "possible_match" as const,
      topics: ["sanction"],
      datasets: ["mock-watchlist"],
      sourceUrl: "https://www.opensanctions.org/",
      explanation:
        "Mock review lead based on a similar vessel or operator name. Treat as a false-positive-prone triage signal."
    }
  ].slice(0, maxResults);

  return {
    status: "ok",
    mode: "mock",
    provider: "mock",
    source: {
      title: "Mock sanctions screening",
      url: "https://www.opensanctions.org/docs/api/",
      attribution: "Mock screening context for local development"
    },
    generatedAt,
    cached: false,
    subject: vesselSubject(vessel),
    matches,
    summary: summariseMatches(matches),
    limitations: [
      "Mock sanctions screening is for offline UI development only and is not live sanctions, ownership, or compliance data.",
      "All matches are review leads and can be false positives."
    ]
  };
}

function vesselSubject(vessel: Vessel): SanctionsScreeningResponse["subject"] {
  return {
    vesselId: vessel.id,
    mmsi: vessel.mmsi,
    name: vessel.name,
    shipType: vessel.shipType,
    ...(vessel.callSign ? { callSign: vessel.callSign } : {}),
    ...(vessel.destination ? { destination: vessel.destination } : {})
  };
}

function summariseMatches(
  matches: SanctionsScreeningResponse["matches"]
): SanctionsScreeningResponse["summary"] {
  const highestScore = matches.reduce<number | undefined>(
    (highest, match) => (highest === undefined ? match.score : Math.max(highest, match.score)),
    undefined
  );

  return {
    matchCount: matches.length,
    reviewRequiredCount: matches.filter((match) => match.reviewStatus !== "weak_match").length,
    ...(highestScore === undefined ? {} : { highestScore })
  };
}

function emptySummary(): SanctionsScreeningResponse["summary"] {
  return {
    matchCount: 0,
    reviewRequiredCount: 0
  };
}

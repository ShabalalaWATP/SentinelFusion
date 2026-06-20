import type { FireContextResponse, RiskLevel, TrafficAreaBounds } from "@aisstream/shared";

export const firmsProviderSource = {
  title: "NASA FIRMS Active Fire",
  url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
  attribution: "Active fire data by NASA FIRMS, LANCE, EOSDIS"
};

export function toFireContextResponse({
  area,
  dayRange,
  detections,
  generatedAt,
  cached,
  maxDetections,
  providerRows,
  sourceDataset,
  truncated
}: {
  area: TrafficAreaBounds;
  dayRange: number;
  detections: FireContextResponse["detections"];
  generatedAt: string;
  cached: boolean;
  maxDetections: number;
  providerRows: number;
  sourceDataset: string;
  truncated: boolean;
}): FireContextResponse {
  const cappedDetections = detections
    .sort(compareDetections)
    .slice(0, maxDetections);

  return {
    status: "ok",
    mode: "live",
    source: firmsProviderSource,
    generatedAt,
    cached,
    area,
    sourceDataset,
    dayRange,
    detections: cappedDetections,
    summary: summarise(cappedDetections),
    risk: assessRisk(cappedDetections),
    limitations: buildLimitations(providerRows, cappedDetections.length, truncated)
  };
}

export function notConfiguredFireContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  sourceDataset: string,
  dayRange: number,
  options: { limitation?: string; reason?: string } = {}
): FireContextResponse {
  return {
    status: "not_configured",
    mode: "live",
    source: firmsProviderSource,
    generatedAt,
    cached: false,
    area,
    sourceDataset,
    dayRange,
    detections: [],
    summary: emptySummary(),
    risk: {
      level: "low",
      reasons: [options.reason ?? "NASA FIRMS fire context is not configured for this deployment."]
    },
    limitations: [
      options.limitation ?? "Set FIRMS_MAP_KEY on the API server to enable live fire detections."
    ]
  };
}

export function mockFireContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  sourceDataset: string,
  dayRange: number
): FireContextResponse {
  const latitude = (area.south + area.north) / 2;
  const longitude = area.west <= area.east ? (area.west + area.east) / 2 : area.west;
  const detections: FireContextResponse["detections"] = [
    {
      id: `mock-firms-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
      latitude,
      longitude,
      acquiredAt: generatedAt,
      confidence: "nominal",
      rawConfidence: "n",
      satellite: "N",
      instrument: "VIIRS",
      version: "mock",
      dayNight: "day",
      brightnessKelvin: 331.4,
      fireRadiativePowerMw: 18.6
    }
  ];

  return {
    status: "ok",
    mode: "mock",
    source: firmsProviderSource,
    generatedAt,
    cached: false,
    area,
    sourceDataset,
    dayRange,
    detections,
    summary: summarise(detections),
    risk: assessRisk(detections),
    limitations: ["Mock FIRMS detections are for offline development only."]
  };
}

export function providerErrorFireContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  sourceDataset: string,
  dayRange: number,
  message: string
): FireContextResponse {
  return {
    status: "error",
    mode: "live",
    source: firmsProviderSource,
    generatedAt,
    cached: false,
    area,
    sourceDataset,
    dayRange,
    detections: [],
    summary: emptySummary(),
    risk: {
      level: "medium",
      reasons: ["NASA FIRMS fire context is currently unavailable."]
    },
    limitations: ["Retry later or use FIRMS_MODE=mock for offline development."],
    error: message.slice(0, 240)
  };
}

function compareDetections(
  left: FireContextResponse["detections"][number],
  right: FireContextResponse["detections"][number]
): number {
  const confidenceDelta = confidenceRank(right.confidence) - confidenceRank(left.confidence);
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const frpDelta = (right.fireRadiativePowerMw ?? 0) - (left.fireRadiativePowerMw ?? 0);
  if (frpDelta !== 0) {
    return frpDelta;
  }

  return Date.parse(right.acquiredAt) - Date.parse(left.acquiredAt);
}

function summarise(detections: FireContextResponse["detections"]): FireContextResponse["summary"] {
  const frpValues = detections
    .map((detection) => detection.fireRadiativePowerMw)
    .filter((value): value is number => value !== undefined);
  const acquiredTimes = detections.map((detection) => Date.parse(detection.acquiredAt));
  const maxFireRadiativePowerMw = frpValues.length > 0 ? Math.max(...frpValues) : undefined;
  const latestTime = acquiredTimes.length > 0 ? Math.max(...acquiredTimes) : undefined;

  return {
    count: detections.length,
    highConfidenceCount: detections.filter((detection) => detection.confidence === "high").length,
    dayCount: detections.filter((detection) => detection.dayNight === "day").length,
    nightCount: detections.filter((detection) => detection.dayNight === "night").length,
    ...(maxFireRadiativePowerMw !== undefined ? { maxFireRadiativePowerMw } : {}),
    ...(latestTime !== undefined ? { latestAcquiredAt: new Date(latestTime).toISOString() } : {})
  };
}

function assessRisk(detections: FireContextResponse["detections"]): {
  level: RiskLevel;
  reasons: string[];
} {
  if (detections.length === 0) {
    return { level: "low", reasons: ["No active fire detections were returned for this area."] };
  }

  const highConfidenceCount = detections.filter((detection) => detection.confidence === "high").length;
  const maxFrp = summarise(detections).maxFireRadiativePowerMw ?? 0;

  if (highConfidenceCount >= 3 || maxFrp >= 50) {
    return {
      level: "high",
      reasons: [`${detections.length} active fire detections include strong confidence or FRP signals.`]
    };
  }

  return {
    level: "medium",
    reasons: [`${detections.length} active fire detections may affect area operations.`]
  };
}

function buildLimitations(providerRows: number, returnedRows: number, truncated: boolean): string[] {
  return [
    "FIRMS active-fire points are satellite thermal detections and can include false positives or missed fires.",
    "Near-real-time detections are decision-support context, not emergency response advice.",
    ...(truncated
      ? ["Provider rows were capped before processing to protect API availability."]
      : []),
    ...(providerRows > returnedRows
      ? [`Showing the strongest ${returnedRows} detections from ${providerRows} provider rows.`]
      : [])
  ];
}

function emptySummary(): FireContextResponse["summary"] {
  return {
    count: 0,
    highConfidenceCount: 0,
    dayCount: 0,
    nightCount: 0
  };
}

function confidenceRank(value: FireContextResponse["detections"][number]["confidence"]): number {
  return { high: 3, nominal: 2, low: 1, unknown: 0 }[value];
}

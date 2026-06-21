import type { ConflictContextResponse } from "@aisstream/shared";

export type AcledNormaliseResult = {
  events: ConflictContextResponse["events"];
  providerRows: number;
  truncated: boolean;
};

type AcledRow = Record<string, unknown>;

export function normaliseAcledResponse(value: unknown, maxRows: number): AcledNormaliseResult {
  const rows = extractRows(value);
  const truncated = rows.length > maxRows;
  const limitedRows = rows.slice(0, maxRows);
  const events = limitedRows.flatMap((row) => {
    const event = normaliseAcledRow(row);
    return event ? [event] : [];
  });

  return {
    events,
    providerRows: rows.length,
    truncated
  };
}

function extractRows(value: unknown): AcledRow[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((row): row is AcledRow => Boolean(row && typeof row === "object"));
}

function normaliseAcledRow(row: AcledRow): ConflictContextResponse["events"][number] | null {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  const eventDate = toDateOnly(row.event_date);
  const id = toText(row.event_id_cnty) ?? toText(row.event_id_no_cnty);
  const eventType = toText(row.event_type);
  const location = toText(row.location);

  if (!id || !eventDate || !eventType || !location || latitude === undefined || longitude === undefined) {
    return null;
  }

  const geoPrecision = toInteger(row.geo_precision);
  const fatalities = toInteger(row.fatalities) ?? 0;
  const subEventType = toText(row.sub_event_type);
  const disorderType = toText(row.disorder_type);

  return {
    id,
    eventDate,
    eventType,
    ...(subEventType ? { subEventType } : {}),
    ...(disorderType ? { disorderType } : {}),
    ...(toText(row.country) ? { country: toText(row.country) } : {}),
    ...(adminArea(row) ? { adminArea: adminArea(row) } : {}),
    location,
    latitude,
    longitude,
    ...(geoPrecision ? { geoPrecision } : {}),
    geocodingConfidence: confidenceFromPrecision(geoPrecision),
    fatalities,
    severity: severityFor(eventType, fatalities),
    ...(toText(row.source) ? { sourceName: toText(row.source) } : {}),
    ...(toText(row.source_scale) ? { sourceScale: toText(row.source_scale) } : {}),
    ...(toText(row.notes) ? { notes: truncate(toText(row.notes)!, 600) } : {})
  };
}

function adminArea(row: AcledRow): string | undefined {
  return [toText(row.admin1), toText(row.admin2)].filter(Boolean).join(", ") || undefined;
}

function confidenceFromPrecision(
  value: number | undefined
): ConflictContextResponse["events"][number]["geocodingConfidence"] {
  if (value === 1) {
    return "high";
  }
  if (value === 2) {
    return "medium";
  }
  if (value === 3) {
    return "low";
  }
  return "unknown";
}

function severityFor(
  eventType: string,
  fatalities: number
): ConflictContextResponse["events"][number]["severity"] {
  if (fatalities > 0 || /battle|explosion|violence/i.test(eventType)) {
    return "high";
  }

  if (/riot|protest|strategic/i.test(eventType)) {
    return "medium";
  }

  return "low";
}

function toText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInteger(value: unknown): number | undefined {
  const parsed = toNumber(value);
  return parsed === undefined ? undefined : Math.max(0, Math.trunc(parsed));
}

function toDateOnly(value: unknown): string | undefined {
  const text = toText(value);
  if (!text) {
    return undefined;
  }

  const match = /^\d{4}-\d{2}-\d{2}/.exec(text);
  return match?.[0];
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

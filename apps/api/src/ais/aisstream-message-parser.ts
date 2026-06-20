import type { AisRawMessage } from "@aisstream/shared";
import { aisRawMessageSchema } from "@aisstream/shared";

type JsonRecord = Record<string, unknown>;

export type AisStreamParseResult =
  | {
      kind: "message";
      message: AisRawMessage;
    }
  | {
      kind: "dropped";
      reason: string;
    }
  | {
      kind: "error";
      message: string;
    };

const navigationStatuses = new Map<number, string>([
  [0, "Under way using engine"],
  [1, "At anchor"],
  [2, "Not under command"],
  [3, "Restricted manoeuvrability"],
  [4, "Constrained by draught"],
  [5, "Moored"],
  [6, "Aground"],
  [7, "Fishing"],
  [8, "Sailing"]
]);

export function parseAisStreamEnvelope(envelope: unknown): AisStreamParseResult {
  const root = asRecord(envelope);
  if (!root) {
    return { kind: "dropped", reason: "AISstream frame was not a JSON object." };
  }

  const apiError = getString(root.error);
  if (apiError) {
    return { kind: "error", message: apiError };
  }

  const messageType = getString(root.MessageType);
  const metadata = asRecord(root.MetaData) ?? asRecord(root.Metadata) ?? {};
  const messageContainer = asRecord(root.Message) ?? {};
  const payload = (messageType ? asRecord(messageContainer[messageType]) : undefined) ??
    messageContainer;

  const mmsi = normaliseMmsi(
    payload.UserID ?? payload.MMSI ?? metadata.MMSI ?? metadata.MMSI_String
  );
  const latitude = getNumber(payload.Latitude ?? payload.latitude ?? metadata.latitude);
  const longitude = getNumber(payload.Longitude ?? payload.longitude ?? metadata.longitude);

  if (!mmsi || latitude === undefined || longitude === undefined) {
    return {
      kind: "dropped",
      reason: `AISstream ${messageType ?? "unknown"} frame lacked usable MMSI or position.`
    };
  }

  const raw = aisRawMessageSchema.safeParse({
    mmsi,
    name: getTrimmedString(
      payload.Name ?? payload.ShipName ?? metadata.ShipName ?? metadata.Name
    ),
    callSign: getTrimmedString(payload.CallSign ?? metadata.CallSign),
    shipType: normaliseShipType(payload.ShipType ?? payload.Type ?? metadata.ShipType),
    longitude,
    latitude,
    speedOverGround: boundedNumber(
      getNumber(payload.Sog ?? payload.SpeedOverGround ?? payload.SOG),
      0,
      80,
      0
    ),
    courseOverGround: normaliseBearing(
      getNumber(payload.Cog ?? payload.CourseOverGround ?? payload.COG)
    ),
    heading: normaliseOptionalBearing(getNumber(payload.TrueHeading ?? payload.Heading)),
    destination: getTrimmedString(payload.Destination ?? metadata.Destination),
    navigationalStatus: normaliseNavigationalStatus(
      payload.NavigationalStatus ?? payload.Status
    ),
    timestamp: parseAisTimestamp(
      metadata.time_utc ?? root.TimeReceived ?? payload.Timestamp
    )
  });

  if (!raw.success) {
    return { kind: "dropped", reason: "AISstream frame failed local schema validation." };
  }

  return { kind: "message", message: raw.data };
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getTrimmedString(value: unknown): string | undefined {
  const text = getString(value)?.replace(/[<>]/g, "").replace(/\p{Cc}/gu, "");
  return text && text.length > 0 ? text.slice(0, 160) : undefined;
}

function normaliseMmsi(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    const text = String(value);
    return /^\d{9}$/.test(text) ? text : undefined;
  }

  if (typeof value === "string") {
    const text = value.trim();
    return /^\d{9}$/.test(text) ? text : undefined;
  }

  return undefined;
}

function normaliseShipType(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `AIS type ${value}`;
  }

  return getTrimmedString(value);
}

function normaliseNavigationalStatus(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return navigationStatuses.get(value) ?? `AIS status ${value}`;
  }

  return getTrimmedString(value);
}

function boundedNumber(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const number = value ?? fallback;
  return Number(Math.max(minimum, Math.min(maximum, number)).toFixed(3));
}

function normaliseBearing(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  const bearing = value % 360;
  return Number((bearing < 0 ? bearing + 360 : bearing).toFixed(3));
}

function normaliseOptionalBearing(value: number | undefined): number | undefined {
  if (value === undefined || value >= 511) {
    return undefined;
  }

  return normaliseBearing(value);
}

function parseAisTimestamp(value: unknown): string {
  const text = getString(value);
  if (!text) {
    return new Date().toISOString();
  }

  const aisMatch = text.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))? ([+-]\d{2})(\d{2})(?: UTC)?$/
  );
  if (aisMatch) {
    const [, date, time, fraction = "0", offsetHours, offsetMinutes] = aisMatch;
    const milliseconds = fraction.slice(0, 3).padEnd(3, "0");
    return new Date(
      `${date}T${time}.${milliseconds}${offsetHours}:${offsetMinutes}`
    ).toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

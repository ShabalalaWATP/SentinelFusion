import type { FireContextResponse } from "@aisstream/shared";

type FirmsCsvRow = Record<string, string>;
export type FirmsNormaliseResult = {
  detections: FireContextResponse["detections"];
  providerRows: number;
  truncated: boolean;
};

export function normaliseFirmsCsv(
  csvText: string,
  sourceDataset: string,
  maxRows: number
): FirmsNormaliseResult {
  const parsed = parseCsvRows(csvText, maxRows);

  return {
    detections: parsed.rows
      .map((row) => normaliseDetection(row, sourceDataset))
      .filter((detection): detection is NonNullable<typeof detection> => Boolean(detection)),
    providerRows: parsed.rows.length,
    truncated: parsed.truncated
  };
}

function parseCsvRows(value: string, maxRows: number): { rows: FirmsCsvRow[]; truncated: boolean } {
  const parsed = parseCsv(value.trim(), maxRows + 1);
  const rows = parsed.rows;
  if (rows.length === 0) {
    return { rows: [], truncated: false };
  }

  const headers = rows[0]?.map((header) => header.trim());
  if (!headers?.includes("latitude") || !headers.includes("longitude")) {
    throw new Error("FIRMS response did not include expected CSV headers.");
  }

  return {
    rows: rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]))
    ),
    truncated: parsed.truncated
  };
}

function parseCsv(value: string, maxRows: number): { rows: string[][]; truncated: boolean } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  let truncated = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      if (rows.length >= maxRows) {
        truncated = true;
        break;
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (!truncated && (field.length > 0 || row.length > 0)) {
    row.push(field);
    rows.push(row);
  }

  return {
    rows: rows.filter((cells) => cells.some((cell) => cell.trim().length > 0)),
    truncated
  };
}

function normaliseDetection(
  row: FirmsCsvRow,
  sourceDataset: string
): FireContextResponse["detections"][number] | null {
  const latitude = numberAt(row.latitude);
  const longitude = numberAt(row.longitude);
  const acquiredAt = toAcquiredAt(row.acq_date, row.acq_time);

  if (latitude === undefined || longitude === undefined || !acquiredAt) {
    return null;
  }

  const frp = numberAt(row.frp);

  return {
    id: [
      sourceDataset,
      latitude.toFixed(5),
      longitude.toFixed(5),
      acquiredAt,
      frp?.toFixed(2) ?? "no-frp"
    ].join(":"),
    latitude,
    longitude,
    acquiredAt,
    confidence: normaliseConfidence(row.confidence),
    ...(row.confidence ? { rawConfidence: row.confidence } : {}),
    ...(row.satellite ? { satellite: row.satellite } : {}),
    ...(row.instrument ? { instrument: row.instrument } : {}),
    ...(row.version ? { version: row.version } : {}),
    dayNight: normaliseDayNight(row.daynight),
    ...(numberAt(row.bright_ti4 ?? row.brightness) !== undefined
      ? { brightnessKelvin: numberAt(row.bright_ti4 ?? row.brightness) }
      : {}),
    ...(frp !== undefined ? { fireRadiativePowerMw: frp } : {}),
    ...(numberAt(row.scan) !== undefined ? { scanKm: numberAt(row.scan) } : {}),
    ...(numberAt(row.track) !== undefined ? { trackKm: numberAt(row.track) } : {})
  };
}

function normaliseConfidence(value: string | undefined): FireContextResponse["detections"][number]["confidence"] {
  const normalised = value?.trim().toLowerCase();
  if (normalised === "h" || normalised === "high") {
    return "high";
  }
  if (normalised === "n" || normalised === "nominal" || normalised === "normal") {
    return "nominal";
  }
  if (normalised === "l" || normalised === "low") {
    return "low";
  }

  const numeric = normalised ? Number(normalised) : Number.NaN;
  if (Number.isFinite(numeric)) {
    if (numeric >= 80) {
      return "high";
    }
    return numeric >= 30 ? "nominal" : "low";
  }

  return "unknown";
}

function normaliseDayNight(value: string | undefined): FireContextResponse["detections"][number]["dayNight"] {
  if (value?.toUpperCase() === "D") {
    return "day";
  }
  if (value?.toUpperCase() === "N") {
    return "night";
  }
  return "unknown";
}

function numberAt(value: string | undefined): number | undefined {
  const number = value === undefined || value === "" ? Number.NaN : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toAcquiredAt(date: string | undefined, time: string | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const value = (time ?? "").padStart(4, "0");
  if (!/^\d{4}$/.test(value)) {
    return null;
  }

  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  if (hour > 23 || minute > 59) {
    return null;
  }

  return new Date(`${date}T${value.slice(0, 2)}:${value.slice(2, 4)}:00.000Z`).toISOString();
}

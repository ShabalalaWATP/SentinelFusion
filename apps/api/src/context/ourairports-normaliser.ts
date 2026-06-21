import type { AirportContextResponse } from "@aisstream/shared";

export type AirportRecord = Omit<
  AirportContextResponse["airports"][number],
  "bearingDegrees" | "distanceKm" | "runways"
>;
type RunwayRecord = AirportContextResponse["airports"][number]["runways"][number];

export type OurAirportsDataset = {
  airports: AirportRecord[];
  runwaysByAirport: Map<string, RunwayRecord[]>;
  airportRows: number;
  runwayRows: number;
  airportsTruncated: boolean;
  runwaysTruncated: boolean;
};

type NormaliseInput = {
  airportsCsv: string;
  runwaysCsv: string;
  maxAirportRows: number;
  maxRunwayRows: number;
  maxRunwaysPerAirport: number;
};

const airportTypes = new Set([
  "balloonport",
  "closed_airport",
  "heliport",
  "large_airport",
  "medium_airport",
  "seaplane_base",
  "small_airport"
]);

export function normaliseOurAirportsData(input: NormaliseInput): OurAirportsDataset {
  const airportsTable = parseCsvTable(input.airportsCsv, input.maxAirportRows);
  const runwaysTable = parseCsvTable(input.runwaysCsv, input.maxRunwayRows);
  const airports = airportsTable.rows
    .map((row) => toAirportRecord(row, airportsTable.headers))
    .filter((airport): airport is AirportRecord => Boolean(airport));
  const runwaysByAirport = new Map<string, RunwayRecord[]>();

  for (const row of runwaysTable.rows) {
    const runway = toRunwayRecord(row, runwaysTable.headers);
    const airportIdent = valueAt(row, runwaysTable.headers, "airport_ident");
    if (!runway || !airportIdent) {
      continue;
    }

    const existing = runwaysByAirport.get(airportIdent) ?? [];
    existing.push(runway);
    runwaysByAirport.set(airportIdent, existing);
  }

  for (const [ident, runways] of runwaysByAirport.entries()) {
    runwaysByAirport.set(
      ident,
      sortRunways(runways).filter((runway) => !runway.closed).slice(0, input.maxRunwaysPerAirport)
    );
  }

  return {
    airports: airports.filter((airport) => airport.type !== "closed_airport"),
    runwaysByAirport,
    airportRows: airportsTable.rows.length,
    runwayRows: runwaysTable.rows.length,
    airportsTruncated: airportsTable.truncated,
    runwaysTruncated: runwaysTable.truncated
  };
}

function toAirportRecord(row: string[], headers: Map<string, number>): AirportRecord | null {
  const latitude = numericValue(row, headers, "latitude_deg");
  const longitude = numericValue(row, headers, "longitude_deg");
  const id = valueAt(row, headers, "id");
  const ident = valueAt(row, headers, "ident");
  const type = valueAt(row, headers, "type");
  const name = valueAt(row, headers, "name");

  if (!id || !ident || !type || !name || latitude === undefined || longitude === undefined) {
    return null;
  }

  if (!airportTypes.has(type)) {
    return null;
  }

  return {
    id,
    ident,
    type: type as AirportRecord["type"],
    name,
    latitude,
    longitude,
    elevationFt: integerValue(row, headers, "elevation_ft"),
    isoCountry: optionalValue(row, headers, "iso_country"),
    municipality: optionalValue(row, headers, "municipality"),
    scheduledService: valueAt(row, headers, "scheduled_service") === "yes",
    gpsCode: optionalValue(row, headers, "gps_code"),
    iataCode: optionalValue(row, headers, "iata_code"),
    icaoCode: optionalValue(row, headers, "icao_code"),
    sourceUrl: `https://ourairports.com/airports/${encodeURIComponent(ident)}/`
  };
}

function toRunwayRecord(row: string[], headers: Map<string, number>): RunwayRecord | null {
  const id = valueAt(row, headers, "id");
  if (!id) {
    return null;
  }

  return {
    id,
    lengthFt: integerValue(row, headers, "length_ft"),
    widthFt: integerValue(row, headers, "width_ft"),
    surface: optionalValue(row, headers, "surface"),
    lighted: valueAt(row, headers, "lighted") === "1",
    closed: valueAt(row, headers, "closed") === "1",
    lowEnd: {
      ident: optionalValue(row, headers, "le_ident"),
      latitude: numericValue(row, headers, "le_latitude_deg"),
      longitude: numericValue(row, headers, "le_longitude_deg"),
      elevationFt: integerValue(row, headers, "le_elevation_ft"),
      headingDegrees: numericValue(row, headers, "le_heading_degT")
    },
    highEnd: {
      ident: optionalValue(row, headers, "he_ident"),
      latitude: numericValue(row, headers, "he_latitude_deg"),
      longitude: numericValue(row, headers, "he_longitude_deg"),
      elevationFt: integerValue(row, headers, "he_elevation_ft"),
      headingDegrees: numericValue(row, headers, "he_heading_degT")
    }
  };
}

function sortRunways(runways: RunwayRecord[]): RunwayRecord[] {
  return [...runways].sort((left, right) => {
    if (left.closed !== right.closed) {
      return left.closed ? 1 : -1;
    }

    return (right.lengthFt ?? 0) - (left.lengthFt ?? 0);
  });
}

function parseCsvTable(text: string, maxRows: number): {
  headers: Map<string, number>;
  rows: string[][];
  truncated: boolean;
} {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headerRow = parseCsvLine(lines[0] ?? "");
  const headers = new Map(headerRow.map((header, index) => [header, index]));
  const rows: string[][] = [];

  for (let index = 1; index < lines.length && rows.length < maxRows; index += 1) {
    rows.push(parseCsvLine(lines[index]!));
  }

  return {
    headers,
    rows,
    truncated: Math.max(0, lines.length - 1) > maxRows
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === "\"" && next === "\"" && inQuotes) {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function valueAt(row: string[], headers: Map<string, number>, key: string): string | undefined {
  const index = headers.get(key);
  if (index === undefined) {
    return undefined;
  }

  return row[index]?.trim();
}

function optionalValue(row: string[], headers: Map<string, number>, key: string): string | undefined {
  const value = valueAt(row, headers, key);
  return value ? value : undefined;
}

function numericValue(row: string[], headers: Map<string, number>, key: string): number | undefined {
  const value = optionalValue(row, headers, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerValue(row: string[], headers: Map<string, number>, key: string): number | undefined {
  const value = numericValue(row, headers, key);
  return value === undefined ? undefined : Math.round(value);
}

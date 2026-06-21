import { Building2, ChevronDown, MapPinned, Plane, RefreshCw, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Aircraft, AirportContextResponse, AnalysisAreaResult } from "@aisstream/shared";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useMapStore } from "../../stores/mapStore";

type AirportContextPanelProps =
  | {
      area: AnalysisAreaResult;
      aircraft?: never;
    }
  | {
      aircraft: Aircraft;
      area?: never;
    };

const emptyAirports: AirportContextResponse["airports"] = [];

export function AirportContextPanel({ aircraft, area }: AirportContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const areaStatus = useAirportContextStore((state) => state.areaStatus);
  const areaResult = useAirportContextStore((state) => state.areaResult);
  const areaError = useAirportContextStore((state) => state.areaError);
  const aircraftStatuses = useAirportContextStore((state) => state.aircraftStatuses);
  const aircraftResults = useAirportContextStore((state) => state.aircraftResults);
  const aircraftErrors = useAirportContextStore((state) => state.aircraftErrors);
  const refreshArea = useAirportContextStore((state) => state.refreshArea);
  const refreshAircraft = useAirportContextStore((state) => state.refreshAircraft);
  const setIntelligenceLayer = useMapStore((state) => state.setIntelligenceLayer);
  const aircraftId = aircraft?.id;
  const status = aircraftId ? aircraftStatuses[aircraftId] ?? "idle" : areaStatus;
  const error = aircraftId ? aircraftErrors[aircraftId] ?? null : areaError;
  const result = aircraftId
    ? visibleAircraftResult(aircraftResults[aircraftId], aircraftId)
    : visibleAreaResult(areaResult, area);
  const airports = result?.airports ?? emptyAirports;
  const topAirports = useMemo(() => airports.slice(0, 5), [airports]);
  const areaBounds = area?.bounds;
  const refresh = (): Promise<void> => {
    if (aircraftId) {
      return refreshAircraft(aircraftId);
    }

    return areaBounds ? refreshArea(areaBounds) : Promise.resolve();
  };

  useEffect(() => {
    if (aircraftId) {
      void refreshAircraft(aircraftId);
      return;
    }

    if (areaBounds) {
      void refreshArea(areaBounds);
    }
  }, [aircraftId, areaBounds, refreshArea, refreshAircraft]);

  useEffect(() => {
    if (airports.length > 0) {
      setExpanded(true);
    }
  }, [airports.length]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sky-300/[0.14] text-sky-100">
          <Building2 size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Airport context
            </span>
            <span className="block truncate text-sm font-medium text-slate-100">
              {summaryLabel(status, result, error)}
            </span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-slate-400 transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={() => setIntelligenceLayer("airports", true)}
          disabled={airports.length === 0}
          aria-label="Show airports on map"
          title="Show airports on map"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-sky-300/[0.42] hover:text-sky-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <MapPinned size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === "loading"}
          aria-label="Refresh airport context"
          title="Refresh airport context"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-sky-300/[0.42] hover:text-sky-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <AirportContextBody
            error={error}
            result={result}
            status={status}
            topAirports={topAirports}
          />
        </div>
      ) : null}
    </section>
  );
}

function AirportContextBody({
  error,
  result,
  status,
  topAirports
}: {
  error: string | null;
  result: AirportContextResponse | null;
  status: string;
  topAirports: AirportContextResponse["airports"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading airport and runway context...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Airport context request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Airport context will load for this focus.</p>;
  }

  if (result.status !== "ok") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Airport context is unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <SummaryGrid result={result} />
      {topAirports.length > 0 ? (
        <ul className="space-y-2">
          {topAirports.map((airport) => (
            <AirportRow key={airport.id} airport={airport} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-slate-400">
          No airports were returned for this focus.
        </p>
      )}
      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function SummaryGrid({ result }: { result: AirportContextResponse }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric label="Airports" value={result.summary.count.toLocaleString("en-GB")} />
      <Metric label="Scheduled" value={result.summary.scheduledServiceCount.toLocaleString("en-GB")} />
      <Metric label="Runways" value={result.summary.runwayCount.toLocaleString("en-GB")} />
      <Metric label="Nearest" value={formatDistance(result.summary.nearestDistanceKm)} />
    </div>
  );
}

function AirportRow({ airport }: { airport: AirportContextResponse["airports"][number] }) {
  const longestRunway = airport.runways.find((runway) => runway.lengthFt !== undefined);

  return (
    <li className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">
            {airport.ident} · {airport.name}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {airportTypeLabel(airport.type)}
            {airport.municipality ? ` · ${airport.municipality}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{formatDistance(airport.distanceKm)}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Plane size={12} aria-hidden="true" />
          {airport.scheduledService ? "Scheduled" : "No scheduled service"}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <Ruler size={12} aria-hidden="true" />
          {longestRunway ? runwayLabel(longestRunway) : "No runway data"}
        </span>
      </div>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function summaryLabel(
  status: string,
  result: AirportContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Loading airports";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "Nearest airports and runways";
  }
  if (result.status === "not_configured") {
    return "Provider disabled";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }

  return `${result.summary.count.toLocaleString("en-GB")} airports · nearest ${formatDistance(result.summary.nearestDistanceKm)}`;
}

function visibleAreaResult(
  result: AirportContextResponse | null,
  area: AnalysisAreaResult | undefined
): AirportContextResponse | null {
  if (!area || !result?.area) {
    return null;
  }

  return boundsMatch(result.area, area.bounds) ? result : null;
}

function visibleAircraftResult(
  result: AirportContextResponse | undefined,
  aircraftId: string | undefined
): AirportContextResponse | null {
  if (!aircraftId || !result?.focus?.aircraftId) {
    return null;
  }

  return result.focus.aircraftId === aircraftId ? result : null;
}

function boundsMatch(
  left: AirportContextResponse["area"],
  right: AnalysisAreaResult["bounds"]
): boolean {
  return Boolean(
    left &&
      left.south === right.south &&
      left.west === right.west &&
      left.north === right.north &&
      left.east === right.east
  );
}

function formatDistance(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(1)} km`;
}

function runwayLabel(runway: AirportContextResponse["airports"][number]["runways"][number]): string {
  const ends = [runway.lowEnd.ident, runway.highEnd.ident].filter(Boolean).join("/");
  const length = runway.lengthFt ? `${runway.lengthFt.toLocaleString("en-GB")} ft` : "unknown length";
  return ends ? `${ends} · ${length}` : length;
}

function airportTypeLabel(value: AirportContextResponse["airports"][number]["type"]): string {
  return value.replace(/_/g, " ");
}

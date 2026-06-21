import { CalendarClock, ChevronDown, MapPinned, RefreshCw, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Aircraft, FiledRouteContextResponse } from "@aisstream/shared";
import { useFiledRouteContextStore } from "../../stores/filedRouteContextStore";

type FiledRoutePanelProps = {
  aircraft: Aircraft;
};

const emptyWaypoints: NonNullable<FiledRouteContextResponse["route"]>["waypoints"] = [];

export function FiledRoutePanel({ aircraft }: FiledRoutePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const statuses = useFiledRouteContextStore((state) => state.statuses);
  const results = useFiledRouteContextStore((state) => state.results);
  const errors = useFiledRouteContextStore((state) => state.errors);
  const refresh = useFiledRouteContextStore((state) => state.refresh);
  const status = statuses[aircraft.id] ?? "idle";
  const error = errors[aircraft.id] ?? null;
  const result = visibleResult(results[aircraft.id], aircraft.id);
  const route = result?.route;
  const waypoints = route?.waypoints ?? emptyWaypoints;
  const topWaypoints = useMemo(() => waypoints.slice(0, 8), [waypoints]);

  useEffect(() => {
    void refresh(aircraft.id);
  }, [aircraft.id, refresh]);

  useEffect(() => {
    if (route) {
      setExpanded(true);
    }
  }, [route]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-300/[0.14] text-emerald-100">
          <Route size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-label="Toggle filed route"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Filed route
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
          onClick={() => void refresh(aircraft.id)}
          disabled={status === "loading"}
          aria-label="Refresh filed route"
          title="Refresh filed route"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-emerald-300/[0.42] hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <FiledRouteBody
            error={error}
            result={result}
            status={status}
            topWaypoints={topWaypoints}
          />
        </div>
      ) : null}
    </section>
  );
}

function FiledRouteBody({
  error,
  result,
  status,
  topWaypoints
}: {
  error: string | null;
  result: FiledRouteContextResponse | null;
  status: string;
  topWaypoints: NonNullable<FiledRouteContextResponse["route"]>["waypoints"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Checking filed-route provider...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Filed route request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Filed-route context will load for this aircraft.</p>;
  }

  if (result.status !== "ok" || !result.route) {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Filed route is unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Origin" value={result.route.originAirport ?? "Unknown"} />
        <Metric label="Destination" value={result.route.destinationAirport ?? "Unknown"} />
        <Metric label="Status" value={result.route.status} />
        <Metric label="Confidence" value={result.route.confidence} />
      </div>

      <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-xs text-slate-400">
        {result.route.routeText ?? "No filed route string was returned."}
      </p>

      <div className="grid grid-cols-1 gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <CalendarClock size={13} aria-hidden="true" />
          {formatWindow(result.route)}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPinned size={13} aria-hidden="true" />
          {result.route.waypoints.length.toLocaleString("en-GB")} filed waypoints
        </span>
      </div>

      {topWaypoints.length > 0 ? (
        <p className="text-xs text-slate-400">
          {topWaypoints.map((waypoint) => waypoint.ident).join(" · ")}
        </p>
      ) : null}

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function summaryLabel(
  status: string,
  result: FiledRouteContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Checking provider";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "Planned route provider status";
  }
  if (result.status === "not_configured") {
    return "Provider not configured";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }

  const origin = result.route?.originAirport ?? "Unknown";
  const destination = result.route?.destinationAirport ?? "Unknown";
  return `${origin} to ${destination}`;
}

function visibleResult(
  result: FiledRouteContextResponse | undefined,
  aircraftId: string
): FiledRouteContextResponse | null {
  return result?.aircraft.aircraftId === aircraftId ? result : null;
}

function formatWindow(route: NonNullable<FiledRouteContextResponse["route"]>): string {
  const departure = route.scheduledDeparture ?? route.estimatedDeparture;
  const arrival = route.scheduledArrival ?? route.estimatedArrival;
  if (!departure && !arrival) {
    return "Schedule unavailable";
  }

  return [
    departure ? `Dep ${formatTime(departure)}` : undefined,
    arrival ? `Arr ${formatTime(arrival)}` : undefined
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

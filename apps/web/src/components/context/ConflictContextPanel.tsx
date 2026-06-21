import { ChevronDown, MapPinned, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AnalysisAreaResult, ConflictContextResponse } from "@aisstream/shared";
import { useConflictContextStore } from "../../stores/conflictContextStore";
import { useMapStore } from "../../stores/mapStore";
import { RiskDot } from "../vessels/VesselBadges";

type ConflictContextPanelProps = {
  area: AnalysisAreaResult;
};

const emptyEvents: ConflictContextResponse["events"] = [];

export function ConflictContextPanel({ area }: ConflictContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const status = useConflictContextStore((state) => state.status);
  const result = useConflictContextStore((state) => state.result);
  const error = useConflictContextStore((state) => state.error);
  const refresh = useConflictContextStore((state) => state.refresh);
  const setIntelligenceLayer = useMapStore((state) => state.setIntelligenceLayer);
  const areaKey = `${area.id}:${area.bounds.south}:${area.bounds.west}:${area.bounds.north}:${area.bounds.east}`;
  const visibleResult = result?.area && boundsMatch(result.area, area.bounds) ? result : null;
  const events = visibleResult?.events ?? emptyEvents;
  const topEvents = useMemo(() => events.slice(0, 5), [events]);

  useEffect(() => {
    void refresh(area.bounds);
  }, [area.bounds, areaKey, refresh]);

  useEffect(() => {
    if (events.length > 0) {
      setExpanded(true);
    }
  }, [events.length]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-red-300/[0.14] text-red-100">
          <ShieldAlert size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Conflict and protest
            </span>
            <span className="block truncate text-sm font-medium text-slate-100">
              {summaryLabel(status, visibleResult, error)}
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
          onClick={() => setIntelligenceLayer("conflict-events", true)}
          disabled={events.length === 0}
          aria-label="Show conflict events on map"
          title="Show conflict events on map"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-red-300/[0.42] hover:text-red-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <MapPinned size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void refresh(area.bounds)}
          disabled={status === "loading"}
          aria-label="Refresh conflict context"
          title="Refresh conflict context"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-red-300/[0.42] hover:text-red-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <ConflictContextBody
            error={error}
            result={visibleResult}
            status={status}
            topEvents={topEvents}
          />
        </div>
      ) : null}
    </section>
  );
}

function ConflictContextBody({
  error,
  result,
  status,
  topEvents
}: {
  error: string | null;
  result: ConflictContextResponse | null;
  status: string;
  topEvents: ConflictContextResponse["events"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading live conflict and protest reports...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Conflict context request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Conflict and protest context will load for this area.</p>;
  }

  if (result.status === "error") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Conflict and protest context is unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  if (result.status === "not_configured") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">Live conflict and protest access is not configured.</p>
        <p className="text-slate-400">Add authorised ACLED access on the API server to enable this context.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-100">
            {result.summary.count.toLocaleString("en-GB")} reported events
          </p>
          <p className="text-xs text-slate-500">
            Last {result.lookbackDays} days | {result.provider.toUpperCase()}
            {result.cached ? " | cached" : ""}
          </p>
        </div>
        <RiskDot risk={result.risk.level} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Protests" value={result.summary.protestCount.toLocaleString("en-GB")} />
        <Metric label="Riots" value={result.summary.riotCount.toLocaleString("en-GB")} />
        <Metric label="Violence" value={result.summary.politicalViolenceCount.toLocaleString("en-GB")} />
        <Metric label="Fatalities" value={result.summary.fatalityCount.toLocaleString("en-GB")} />
      </div>

      {topEvents.length > 0 ? (
        <ul className="space-y-2">
          {topEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-slate-400">
          No reported conflict or protest events were returned for this area.
        </p>
      )}

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: ConflictContextResponse["events"][number] }) {
  return (
    <li className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">{event.subEventType ?? event.eventType}</p>
          <p className="mt-1 text-xs uppercase tracking-normal text-slate-500">
            {formatDate(event.eventDate)} | {event.location}
          </p>
        </div>
        <RiskDot risk={event.severity} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {event.eventType}
        {event.fatalities > 0 ? ` | ${event.fatalities.toLocaleString("en-GB")} fatalities` : ""}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {confidenceLabel(event.geocodingConfidence)}
        {event.sourceName ? ` | ${event.sourceName}` : ""}
      </p>
      {event.notes ? <p className="mt-2 text-xs text-slate-400">{event.notes}</p> : null}
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
  result: ConflictContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Loading live reports";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "Live area context";
  }
  if (result.status === "not_configured") {
    return "Provider not configured";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }
  return `${result.summary.count.toLocaleString("en-GB")} events | ${result.risk.level} risk`;
}

function confidenceLabel(value: ConflictContextResponse["events"][number]["geocodingConfidence"]): string {
  return value === "unknown" ? "Location confidence unknown" : `${value} location confidence`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function boundsMatch(
  left: ConflictContextResponse["area"],
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

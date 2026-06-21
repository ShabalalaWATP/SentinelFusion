import { ChevronDown, Clock3, RadioTower, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AirspaceContextResponse, AnalysisAreaResult } from "@aisstream/shared";
import { useAirspaceContextStore } from "../../stores/airspaceContextStore";
import { RiskDot } from "../vessels/VesselBadges";

type AirspaceContextPanelProps = {
  area: AnalysisAreaResult;
};

const emptyNotices: AirspaceContextResponse["notices"] = [];

export function AirspaceContextPanel({ area }: AirspaceContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const status = useAirspaceContextStore((state) => state.status);
  const result = useAirspaceContextStore((state) => state.result);
  const error = useAirspaceContextStore((state) => state.error);
  const refresh = useAirspaceContextStore((state) => state.refresh);
  const areaKey = `${area.id}:${area.bounds.south}:${area.bounds.west}:${area.bounds.north}:${area.bounds.east}`;
  const visibleResult = result?.area && boundsMatch(result.area, area.bounds) ? result : null;
  const notices = visibleResult?.notices ?? emptyNotices;
  const topNotices = useMemo(() => notices.slice(0, 5), [notices]);

  useEffect(() => {
    void refresh(area.bounds);
  }, [area.bounds, areaKey, refresh]);

  useEffect(() => {
    if (notices.length > 0) {
      setExpanded(true);
    }
  }, [notices.length]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cyan-300/[0.14] text-cyan-100">
          <RadioTower size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-label="Toggle airspace notices"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Airspace notices
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
          onClick={() => void refresh(area.bounds)}
          disabled={status === "loading"}
          aria-label="Refresh airspace notices"
          title="Refresh airspace notices"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-cyan-300/[0.42] hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <AirspaceContextBody
            error={error}
            result={visibleResult}
            status={status}
            topNotices={topNotices}
          />
        </div>
      ) : null}
    </section>
  );
}

function AirspaceContextBody({
  error,
  result,
  status,
  topNotices
}: {
  error: string | null;
  result: AirspaceContextResponse | null;
  status: string;
  topNotices: AirspaceContextResponse["notices"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Checking airspace notice provider...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Airspace notice request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Airspace notice context will load for this area.</p>;
  }

  if (result.status !== "ok") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Airspace notices are unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-100">
            {result.summary.count.toLocaleString("en-GB")} notices
          </p>
          <p className="text-xs text-slate-500">
            {result.summary.activeCount.toLocaleString("en-GB")} active ·{" "}
            {result.summary.upcomingCount.toLocaleString("en-GB")} upcoming
            {result.cached ? " · cached" : ""}
          </p>
        </div>
        <RiskDot risk={result.summary.highSeverityCount > 0 ? "high" : "low"} />
      </div>

      {topNotices.length > 0 ? (
        <ul className="space-y-2">
          {topNotices.map((notice) => (
            <NoticeRow key={notice.id} notice={notice} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-slate-400">
          No airspace notices were returned for this area.
        </p>
      )}

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function NoticeRow({ notice }: { notice: AirspaceContextResponse["notices"][number] }) {
  return (
    <li className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">{notice.title}</p>
          <p className="mt-1 text-xs uppercase tracking-normal text-slate-500">
            {notice.type.replace(/_/g, " ")} · {notice.status}
          </p>
        </div>
        <span className="mt-0.5 shrink-0">
          {notice.severity === "high" ? (
            <ShieldAlert size={14} aria-hidden="true" className="text-red-200" />
          ) : (
            <Clock3 size={14} aria-hidden="true" />
          )}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{notice.description}</p>
      <p className="mt-2 text-xs text-slate-500">{formatWindow(notice)}</p>
    </li>
  );
}

function summaryLabel(
  status: string,
  result: AirspaceContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Checking provider";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "NOTAM/TFR provider status";
  }
  if (result.status === "not_configured") {
    return "Provider not configured";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }

  return `${result.summary.count.toLocaleString("en-GB")} notices · ${result.summary.activeCount.toLocaleString("en-GB")} active`;
}

function formatWindow(notice: AirspaceContextResponse["notices"][number]): string {
  if (!notice.startsAt && !notice.endsAt) {
    return "Validity window unknown";
  }

  return [
    notice.startsAt ? `From ${formatTime(notice.startsAt)}` : undefined,
    notice.endsAt ? `Until ${formatTime(notice.endsAt)}` : undefined
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

function boundsMatch(
  left: AirspaceContextResponse["area"],
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

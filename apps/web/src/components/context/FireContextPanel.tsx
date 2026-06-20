import { ChevronDown, Flame, MapPinned, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AnalysisAreaResult, FireContextResponse } from "@aisstream/shared";
import { useFireContextStore } from "../../stores/fireContextStore";
import { useMapStore } from "../../stores/mapStore";
import { RiskDot } from "../vessels/VesselBadges";

type FireContextPanelProps = {
  area: AnalysisAreaResult;
};

const emptyDetections: FireContextResponse["detections"] = [];

export function FireContextPanel({ area }: FireContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const status = useFireContextStore((state) => state.status);
  const result = useFireContextStore((state) => state.result);
  const error = useFireContextStore((state) => state.error);
  const refresh = useFireContextStore((state) => state.refresh);
  const setIntelligenceLayer = useMapStore((state) => state.setIntelligenceLayer);
  const areaKey = `${area.id}:${area.bounds.south}:${area.bounds.west}:${area.bounds.north}:${area.bounds.east}`;
  const visibleResult = result?.area && boundsMatch(result.area, area.bounds) ? result : null;
  const detections = visibleResult?.detections ?? emptyDetections;

  useEffect(() => {
    void refresh(area.bounds);
  }, [area.bounds, areaKey, refresh]);

  useEffect(() => {
    if (detections.length > 0) {
      setExpanded(true);
    }
  }, [detections.length]);

  const topDetections = useMemo(() => detections.slice(0, 5), [detections]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-orange-300/[0.14] text-orange-100">
          <Flame size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Fire context
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
          onClick={() => setIntelligenceLayer("fire-anomalies", true)}
          disabled={detections.length === 0}
          aria-label="Show fire detections on map"
          title="Show fire detections on map"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-orange-300/[0.42] hover:text-orange-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <MapPinned size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void refresh(area.bounds)}
          disabled={status === "loading"}
          aria-label="Refresh fire context"
          title="Refresh fire context"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-orange-300/[0.42] hover:text-orange-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <FireContextBody
            error={error}
            result={visibleResult}
            status={status}
            topDetections={topDetections}
          />
        </div>
      ) : null}
    </section>
  );
}

function FireContextBody({
  error,
  result,
  status,
  topDetections
}: {
  error: string | null;
  result: FireContextResponse | null;
  status: string;
  topDetections: FireContextResponse["detections"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading live FIRMS detections...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Fire context request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Fire context will load for this area.</p>;
  }

  if (result.status !== "ok") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? result.risk.reasons[0]}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-100">
            {result.summary.count.toLocaleString("en-GB")} active fire detections
          </p>
          <p className="text-xs text-slate-500">
            {result.sourceDataset} · last {result.dayRange} day{result.dayRange === 1 ? "" : "s"}
            {result.cached ? " · cached" : ""}
          </p>
        </div>
        <RiskDot risk={result.risk.level} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="High conf." value={result.summary.highConfidenceCount.toLocaleString("en-GB")} />
        <Metric label="Night" value={result.summary.nightCount.toLocaleString("en-GB")} />
        <Metric label="Max FRP" value={formatFrp(result.summary.maxFireRadiativePowerMw)} />
        <Metric label="Latest" value={formatTime(result.summary.latestAcquiredAt)} />
      </div>

      {topDetections.length > 0 ? (
        <ul className="space-y-2">
          {topDetections.map((detection) => (
            <li key={detection.id} className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-100">{confidenceLabel(detection.confidence)}</span>
                <span className="text-xs text-slate-500">{formatTime(detection.acquiredAt)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {detection.latitude.toFixed(3)}, {detection.longitude.toFixed(3)}
                {detection.fireRadiativePowerMw === undefined ? "" : ` · ${formatFrp(detection.fireRadiativePowerMw)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-slate-400">
          No active fire detections were returned for this area.
        </p>
      )}

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
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function summaryLabel(
  status: string,
  result: FireContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Loading live detections";
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
  return `${result.summary.count.toLocaleString("en-GB")} detections · ${result.risk.level} risk`;
}

function confidenceLabel(value: FireContextResponse["detections"][number]["confidence"]): string {
  return value === "unknown" ? "Unknown confidence" : `${value} confidence`;
}

function formatFrp(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(1)} MW`;
}

function formatTime(value: string | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function boundsMatch(
  left: FireContextResponse["area"],
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

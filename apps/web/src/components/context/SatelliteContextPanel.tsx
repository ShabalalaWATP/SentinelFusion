import { ChevronDown, ExternalLink, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisAreaResult, SatelliteContextResponse } from "@aisstream/shared";
import { useSatelliteContextStore } from "../../stores/satelliteContextStore";

type SatelliteContextPanelProps = {
  area: AnalysisAreaResult;
};

export function SatelliteContextPanel({ area }: SatelliteContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const status = useSatelliteContextStore((state) => state.status);
  const result = useSatelliteContextStore((state) => state.result);
  const error = useSatelliteContextStore((state) => state.error);
  const refresh = useSatelliteContextStore((state) => state.refresh);
  const areaKey = `${area.id}:${area.bounds.south}:${area.bounds.west}:${area.bounds.north}:${area.bounds.east}`;
  const visibleResult = result?.area && boundsMatch(result.area, area.bounds) ? result : null;

  useEffect(() => {
    void refresh(area.bounds);
  }, [area.bounds, areaKey, refresh]);

  useEffect(() => {
    if (visibleResult?.snapshot) {
      setExpanded(true);
    }
  }, [visibleResult?.snapshot]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-300/[0.14] text-emerald-100">
          <ImageIcon size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-label="Toggle satellite snapshot"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Satellite snapshot
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
          aria-label="Refresh satellite snapshot"
          title="Refresh satellite snapshot"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-emerald-300/[0.42] hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <SatelliteContextBody error={error} result={visibleResult} status={status} />
        </div>
      ) : null}
    </section>
  );
}

function SatelliteContextBody({
  error,
  result,
  status
}: {
  error: string | null;
  result: SatelliteContextResponse | null;
  status: string;
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading satellite snapshot...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Satellite snapshot request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Satellite context will load for this area.</p>;
  }

  if (result.status !== "ok" || !result.snapshot) {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Satellite snapshot is unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  const imageUrl = safePublicUrl(result.snapshot.imageUrl);
  const sourceUrl = safePublicUrl(result.source.url);

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="overflow-hidden rounded-md border border-slate-500/[0.16] bg-slate-950/[0.46]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${result.snapshot.title} satellite snapshot for selected area`}
            className="aspect-square w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : result.provider === "mock" ? (
          <div className="grid aspect-square w-full place-items-center bg-[radial-gradient(circle_at_35%_28%,rgba(45,212,191,0.28),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))] text-center">
            <span className="px-4 text-xs font-medium uppercase tracking-normal text-emerald-100">
              Mock satellite snapshot
            </span>
          </div>
        ) : (
          <div className="grid aspect-square w-full place-items-center text-slate-500">
            Snapshot URL unavailable
          </div>
        )}
      </div>

      <div>
        <p className="font-medium text-slate-100">{result.snapshot.title}</p>
        <p className="text-xs text-slate-500">
          {result.snapshot.acquiredDate} · {result.snapshot.layerId}
          {result.cached ? " · cached" : ""}
        </p>
      </div>

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>

      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-100 hover:text-emerald-50"
        >
          Source <ExternalLink size={12} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function summaryLabel(
  status: string,
  result: SatelliteContextResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Loading imagery";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "Recent imagery context";
  }
  if (result.status === "not_configured") {
    return "Provider not configured";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }

  return result.snapshot ? `${result.snapshot.acquiredDate} · ${result.provider}` : "Snapshot unavailable";
}

function boundsMatch(
  left: SatelliteContextResponse["area"],
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

function safePublicUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

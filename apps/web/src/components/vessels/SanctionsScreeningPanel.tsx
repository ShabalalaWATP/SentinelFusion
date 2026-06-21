import { AlertTriangle, ChevronDown, RefreshCw, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SanctionsScreeningResponse, Vessel } from "@aisstream/shared";
import { useSanctionsScreeningStore } from "../../stores/sanctionsScreeningStore";
import { RiskDot } from "./VesselBadges";

type SanctionsScreeningPanelProps = {
  vessel: Vessel;
};

const emptyMatches: SanctionsScreeningResponse["matches"] = [];

export function SanctionsScreeningPanel({ vessel }: SanctionsScreeningPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const statuses = useSanctionsScreeningStore((state) => state.statuses);
  const results = useSanctionsScreeningStore((state) => state.results);
  const errors = useSanctionsScreeningStore((state) => state.errors);
  const refresh = useSanctionsScreeningStore((state) => state.refresh);
  const status = statuses[vessel.id] ?? "idle";
  const error = errors[vessel.id] ?? null;
  const result = visibleResult(results[vessel.id], vessel.id);
  const matches = result?.matches ?? emptyMatches;
  const topMatches = useMemo(() => matches.slice(0, 5), [matches]);

  useEffect(() => {
    void refresh(vessel.id);
  }, [refresh, vessel.id]);

  useEffect(() => {
    if (matches.length > 0) {
      setExpanded(true);
    }
  }, [matches.length]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-300/[0.14] text-amber-100">
          <Scale size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-label="Toggle sanctions screening"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Sanctions screening
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
          onClick={() => void refresh(vessel.id)}
          disabled={status === "loading"}
          aria-label="Refresh sanctions screening"
          title="Refresh sanctions screening"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-amber-300/[0.42] hover:text-amber-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <SanctionsScreeningBody
            error={error}
            result={result}
            status={status}
            topMatches={topMatches}
          />
        </div>
      ) : null}
    </section>
  );
}

function SanctionsScreeningBody({
  error,
  result,
  status,
  topMatches
}: {
  error: string | null;
  result: SanctionsScreeningResponse | null;
  status: string;
  topMatches: SanctionsScreeningResponse["matches"];
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Checking screening provider...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Sanctions screening request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Screening context will load for this vessel.</p>;
  }

  if (result.status !== "ok") {
    return (
      <div className="space-y-2 text-sm leading-5 text-slate-300">
        <p className="text-slate-100">{result.error ?? "Screening is unavailable."}</p>
        <p className="text-slate-400">{result.limitations[0]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-5 text-slate-300">
      <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300/[0.16] bg-amber-300/[0.08] p-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs text-amber-100">
          <AlertTriangle size={14} aria-hidden="true" />
          Review leads only, false positives are possible.
        </span>
        <RiskDot risk={result.summary.reviewRequiredCount > 0 ? "medium" : "low"} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Leads" value={result.summary.matchCount.toLocaleString("en-GB")} />
        <Metric label="Review" value={result.summary.reviewRequiredCount.toLocaleString("en-GB")} />
      </div>

      {topMatches.length > 0 ? (
        <ul className="space-y-2">
          {topMatches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2 text-slate-400">
          No screening leads were returned for this vessel.
        </p>
      )}

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function MatchRow({ match }: { match: SanctionsScreeningResponse["matches"][number] }) {
  const href = safePublicUrl(match.sourceUrl);

  return (
    <li className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">{match.caption}</p>
          <p className="mt-1 text-xs uppercase tracking-normal text-slate-500">
            {match.reviewStatus.replace(/_/g, " ")} · score {Math.round(match.score * 100)}%
          </p>
        </div>
        <RiskDot risk={match.risk} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{match.explanation}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-xs text-cyan-100 underline-offset-2 hover:underline"
        >
          Source
        </a>
      ) : null}
    </li>
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
  result: SanctionsScreeningResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Checking provider";
  }
  if (status === "error") {
    return error ?? "Request failed";
  }
  if (!result) {
    return "Provider status";
  }
  if (result.status === "not_configured") {
    return "Provider not configured";
  }
  if (result.status === "error") {
    return result.error ?? "Provider unavailable";
  }

  return `${result.summary.matchCount.toLocaleString("en-GB")} review leads`;
}

function visibleResult(
  result: SanctionsScreeningResponse | undefined,
  vesselId: string
): SanctionsScreeningResponse | null {
  return result?.subject.vesselId === vesselId ? result : null;
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

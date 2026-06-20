import { ChevronDown, RefreshCw, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisAreaResult, MarineWeatherResponse } from "@aisstream/shared";
import { useMarineWeatherStore } from "../../stores/marineWeatherStore";
import { RiskDot } from "../vessels/VesselBadges";

type MarineWeatherPanelProps = {
  area: AnalysisAreaResult;
};

export function MarineWeatherPanel({ area }: MarineWeatherPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const status = useMarineWeatherStore((state) => state.status);
  const result = useMarineWeatherStore((state) => state.result);
  const error = useMarineWeatherStore((state) => state.error);
  const refresh = useMarineWeatherStore((state) => state.refresh);
  const areaKey = `${area.id}:${area.bounds.south}:${area.bounds.west}:${area.bounds.north}:${area.bounds.east}`;
  const visibleResult = result?.area && boundsMatch(result.area, area.bounds) ? result : null;

  useEffect(() => {
    void refresh(area.bounds);
  }, [area.bounds, areaKey, refresh]);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28]">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cyan-300/[0.12] text-cyan-100">
          <Waves size={16} aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-normal text-slate-500">
              Marine weather
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
          aria-label="Refresh marine weather"
          title="Refresh marine weather"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-cyan-300/[0.42] hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RefreshCw size={14} aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-500/[0.12] px-3 py-3">
          <MarineWeatherBody status={status} result={visibleResult} error={error} />
        </div>
      ) : null}
    </section>
  );
}

function MarineWeatherBody({
  error,
  result,
  status
}: {
  error: string | null;
  result: MarineWeatherResponse | null;
  status: string;
}) {
  if (status === "loading") {
    return <p className="text-sm text-slate-400">Loading live marine conditions...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-red-200">{error ?? "Marine weather request failed."}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-400">Marine conditions will load for this area.</p>;
  }

  if (result.status !== "ok" || !result.current) {
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
            {formatWave(result.current.waveHeightM)} waves
            {result.current.seaSurfaceTemperatureC === undefined
              ? ""
              : ` · ${result.current.seaSurfaceTemperatureC.toFixed(1)} °C SST`}
          </p>
          <p className="text-xs text-slate-500">
            {result.location.label ?? "Nearest sea grid point"} · {formatTime(result.current.time)}
            {result.cached ? " · cached" : ""}
          </p>
        </div>
        <RiskDot risk={result.risk.level} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <WeatherMetric label="Swell" value={formatWave(result.current.swellWaveHeightM)} />
        <WeatherMetric label="Period" value={formatSeconds(result.current.wavePeriodSeconds)} />
        <WeatherMetric label="Current" value={formatSpeed(result.current.oceanCurrentVelocityKt)} />
        <WeatherMetric label="Direction" value={formatDegrees(result.current.waveDirectionDeg)} />
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
          Signal
        </p>
        <ul className="mt-1 space-y-1">
          {result.risk.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        {result.source.attribution}. {result.limitations[0]}
      </p>
    </div>
  );
}

function WeatherMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function summaryLabel(
  status: string,
  result: MarineWeatherResponse | null,
  error: string | null
): string {
  if (status === "loading") {
    return "Loading live conditions";
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

  return `${formatWave(result.current?.waveHeightM)} waves · ${result.risk.level} risk`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatWave(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(1)} m`;
}

function formatSeconds(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(1)} s`;
}

function formatSpeed(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(1)} kt`;
}

function formatDegrees(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Math.round(value)} deg`;
}

function boundsMatch(
  left: MarineWeatherResponse["area"],
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

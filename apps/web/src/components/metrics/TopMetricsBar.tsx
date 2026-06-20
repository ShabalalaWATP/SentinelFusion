import { AlertTriangle, Clock3, Plane, RadioTower, Shield, Ship } from "lucide-react";
import type { MapDomainFilter } from "../../stores/mapStore";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { useVesselStore } from "../../stores/vesselStore";
import { MetricTile } from "./MetricTile";

export function TopMetricsBar() {
  const metrics = useVesselStore((state) => state.metrics);
  const streamStatus = useVesselStore((state) => state.streamStatus);
  const connectionStatus = useVesselStore((state) => state.connectionStatus);
  const lastError = useVesselStore((state) => state.lastError);
  const aircraftMetrics = useAircraftStore((state) => state.metrics);
  const aircraftStreamStatus = useAircraftStore((state) => state.streamStatus);
  const aircraftConnectionStatus = useAircraftStore((state) => state.connectionStatus);
  const aircraftLastError = useAircraftStore((state) => state.lastError);
  const domainFilter = useMapStore((state) => state.domainFilter);
  const setDomainFilter = useMapStore((state) => state.setDomainFilter);

  return (
    <header className="flex flex-col gap-2 border-b border-slate-500/[0.15] bg-ocean-900/[0.92] px-3 py-2 lg:min-h-20 lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-3">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:min-w-[15rem] lg:flex-col lg:items-start lg:justify-center">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-6 text-slate-50">
            Sentinel Fusion
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${statusClass(connectionStatus)}`} />
            <span>{feedLabel("Sea", streamStatus?.mode, undefined, connectionStatus)}</span>
            <span className={`h-2 w-2 rounded-full ${statusClass(aircraftConnectionStatus)}`} />
            <span>
              {feedLabel(
                "Air",
                aircraftStreamStatus?.mode,
                aircraftStreamStatus?.provider,
                aircraftConnectionStatus
              )}
            </span>
          </div>
          <StatusError airError={aircraftLastError} seaError={lastError} />
        </div>
        <DomainSwitch value={domainFilter} onChange={setDomainFilter} />
      </div>

      <div className="grid flex-1 grid-cols-3 overflow-hidden xl:grid-cols-6 lg:pl-4">
        <MetricTile
          label="Vessels"
          value={formatNumber(metrics?.liveVessels)}
          icon={<Ship size={18} aria-hidden="true" />}
        />
        <MetricTile
          label="Aircraft"
          value={formatNumber(aircraftMetrics?.liveAircraft)}
          icon={<Plane size={18} aria-hidden="true" />}
          tone="teal"
        />
        <MetricTile
          label="Tracks"
          value={formatNumber((metrics?.trackedVessels ?? 0) + (aircraftMetrics?.trackedAircraft ?? 0))}
          icon={<RadioTower size={18} aria-hidden="true" />}
          tone="teal"
        />
        <MetricTile
          label="High risk"
          value={formatNumber((metrics?.highRiskVessels ?? 0) + (aircraftMetrics?.emergencyAircraft ?? 0))}
          icon={<AlertTriangle size={18} aria-hidden="true" />}
          tone={(metrics?.highRiskVessels ?? 0) || (aircraftMetrics?.emergencyAircraft ?? 0) ? "red" : "amber"}
        />
        <MetricTile
          label="Military air"
          value={formatNumber(aircraftMetrics?.militaryAircraft)}
          icon={<Shield size={18} aria-hidden="true" />}
          tone="teal"
        />
        <MetricTile
          label="Latency"
          value={formatLatency(Math.max(metrics?.dataLatencyMs ?? 0, aircraftMetrics?.dataLatencyMs ?? 0))}
          icon={<Clock3 size={18} aria-hidden="true" />}
          tone="amber"
        />
      </div>
    </header>
  );
}

function DomainSwitch({
  onChange,
  value
}: {
  onChange(value: MapDomainFilter): void;
  value: MapDomainFilter;
}) {
  const options: Array<{ value: MapDomainFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "vessels", label: "Ships" },
    { value: "aircraft", label: "Aircraft" }
  ];

  return (
    <div className="grid w-[10.5rem] shrink-0 grid-cols-3 rounded-md border border-slate-500/[0.18] bg-slate-950/[0.32] p-1 sm:w-60 lg:mt-3 lg:w-full lg:max-w-[15rem]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-8 rounded text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
            value === option.value
              ? "bg-cyan-300/[0.18] text-cyan-100"
              : "text-slate-400 hover:text-slate-100"
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatusError({
  airError,
  seaError
}: {
  airError: string | null;
  seaError: string | null;
}) {
  const message = [seaError ? `Sea: ${seaError}` : null, airError ? `Air: ${airError}` : null]
    .filter(Boolean)
    .join(" · ");

  return message ? <p className="mt-1 truncate text-xs text-red-200">{message}</p> : null;
}

function feedLabel(
  label: string,
  mode: string | undefined,
  provider: string | undefined,
  connectionStatus: string
): string {
  const source = provider ? `${mode ?? "unknown"} ${provider}` : mode ?? "unknown";
  return `${label} ${source} ${connectionStatus}`;
}

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat("en-GB").format(value ?? 0);
}

function formatLatency(value: number | undefined): string {
  if (!value) {
    return "0 ms";
  }

  return value > 999 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;
}

function statusClass(status: string): string {
  if (status === "open") {
    return "bg-teal-300 shadow-[0_0_16px_rgb(45_212_191_/_0.8)]";
  }

  if (status === "error") {
    return "bg-red-400";
  }

  return "bg-amber-300";
}

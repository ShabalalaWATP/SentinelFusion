import { Bell, Check, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { buildAlertItems, type AlertItem, type AlertStatus } from "../../alerts/alertModels";
import { detectAnomalies } from "../../alerts/anomalyDetection";
import { selectAircraftFilters, useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAnomalyStore } from "../../stores/anomalyStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { filterAircraftBySettings } from "../../traffic/trafficFilters";

type AlertsPanelProps = {
  aircraft: Aircraft[];
  vessels: Vessel[];
  onInspectAircraft(id: string): void;
  onInspectVessel(id: string): void;
};

type AlertView = AlertStatus | "all";

export function AlertsPanel({
  aircraft,
  onInspectAircraft,
  onInspectVessel,
  vessels
}: AlertsPanelProps) {
  const [view, setView] = useState<AlertView>("active");
  const acknowledged = useAlertStore((state) => state.acknowledged);
  const aircraftFilters = useAircraftFilterStore(selectAircraftFilters);
  const dismissed = useAlertStore((state) => state.dismissed);
  const acknowledge = useAlertStore((state) => state.acknowledge);
  const dismiss = useAlertStore((state) => state.dismiss);
  const restore = useAlertStore((state) => state.restore);
  const areaMonitors = useAnomalyStore((state) => state.areaMonitors);
  const entityMonitors = useAnomalyStore((state) => state.entityMonitors);
  const events = useTrafficRuleStore((state) => state.events);
  const filteredAircraft = useMemo(
    () => filterAircraftBySettings(aircraft, aircraftFilters),
    [aircraft, aircraftFilters]
  );
  const anomalies = useMemo(
    () => detectAnomalies({ aircraft: filteredAircraft, areaMonitors, entityMonitors, vessels }),
    [areaMonitors, entityMonitors, filteredAircraft, vessels]
  );
  const alerts = useMemo(
    () => buildAlertItems({ acknowledged, aircraft: filteredAircraft, anomalies, dismissed, events, vessels }),
    [acknowledged, anomalies, dismissed, events, filteredAircraft, vessels]
  );
  const visibleAlerts = alerts.filter((alert) => view === "all" || alert.status === view);
  const activeCount = alerts.filter((alert) => alert.status === "active").length;

  function inspect(alert: AlertItem): void {
    if (!alert.entityId) {
      return;
    }

    if (alert.entityDomain === "vessel") {
      onInspectVessel(alert.entityId);
    }

    if (alert.entityDomain === "aircraft") {
      onInspectAircraft(alert.entityId);
    }
  }

  return (
    <aside className="flex h-[18rem] w-full shrink-0 flex-col border-t border-slate-500/[0.15] bg-ocean-900/[0.96] shadow-panel lg:h-full lg:w-[22rem] lg:border-l lg:border-t-0">
      <div className="border-b border-slate-500/[0.15] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
          Alert centre
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold leading-7 text-slate-50">Live alerts</h2>
          <span className="rounded bg-red-300/[0.12] px-2 py-1 text-xs font-semibold text-red-100">
            {activeCount} active
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid grid-cols-4 gap-1 rounded-md border border-slate-500/[0.16] bg-slate-950/[0.26] p-1">
          {(["active", "acknowledged", "dismissed", "all"] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setView(candidate)}
              aria-pressed={view === candidate}
              className={`rounded px-2 py-2 text-[11px] font-medium capitalize transition ${
                view === candidate
                  ? "bg-cyan-300/[0.16] text-cyan-50"
                  : "text-slate-400 hover:bg-slate-800/[0.7] hover:text-slate-100"
              }`}
            >
              {candidate === "acknowledged" ? "Ack" : candidate}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.slice(0, 40).map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={() => acknowledge(alert.id)}
                onDismiss={() => dismiss(alert.id)}
                onInspect={() => inspect(alert)}
                onRestore={() => restore(alert.id)}
              />
            ))
          ) : (
            <p className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3 text-sm leading-6 text-slate-400">
              No alerts in this view.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
  onInspect,
  onRestore
}: {
  alert: AlertItem;
  onAcknowledge(): void;
  onDismiss(): void;
  onInspect(): void;
  onRestore(): void;
}) {
  const canInspect = alert.entityDomain !== "area" && Boolean(alert.entityId);

  return (
    <article className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.30] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bell size={14} className={severityClass(alert.severity)} aria-hidden="true" />
            <p className="truncate text-sm font-semibold text-slate-100">{alert.title}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{alert.description}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase ${badgeClass(alert.severity)}`}>
          {alert.severity}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <span className="truncate">Source: {alert.source}</span>
        <span className="truncate text-right">{formatTime(alert.occurredAt)}</span>
        <span className="truncate">Status: {alert.status}</span>
        <span className="truncate text-right">{alert.entityLabel ?? alert.entityDomain}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canInspect}
          onClick={onInspect}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-cyan-300/[0.28] px-2 text-xs text-cyan-50 transition hover:bg-cyan-300/[0.10] disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
        >
          <Eye size={13} aria-hidden="true" />
          Jump
        </button>
        {alert.status === "dismissed" ? (
          <button type="button" onClick={onRestore} className="alert-action-button">
            <RotateCcw size={13} aria-hidden="true" />
            Restore
          </button>
        ) : (
          <>
            <button type="button" onClick={onAcknowledge} className="alert-action-button">
              <Check size={13} aria-hidden="true" />
              Acknowledge
            </button>
            <button type="button" onClick={onDismiss} className="alert-action-button">
              <Trash2 size={13} aria-hidden="true" />
              Dismiss
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function badgeClass(severity: AlertItem["severity"]): string {
  if (severity === "critical") {
    return "bg-red-300/[0.18] text-red-100";
  }

  if (severity === "high") {
    return "bg-amber-300/[0.18] text-amber-100";
  }

  if (severity === "medium") {
    return "bg-cyan-300/[0.16] text-cyan-100";
  }

  return "bg-slate-500/[0.18] text-slate-200";
}

function severityClass(severity: AlertItem["severity"]): string {
  if (severity === "critical") {
    return "text-red-100";
  }

  if (severity === "high") {
    return "text-amber-100";
  }

  return "text-cyan-100";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

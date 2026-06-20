import { AlertTriangle, Crosshair, Eye, EyeOff, MapPinned, Pause, Play, Trash2 } from "lucide-react";
import { useMemo, type FormEvent } from "react";
import { trafficAreaRegistry, type TrafficAreaDefinition } from "@aisstream/shared";
import { useShallow } from "zustand/react/shallow";
import { selectAircraftList, useAircraftStore } from "../../stores/aircraftStore";
import { useAnomalyStore } from "../../stores/anomalyStore";
import { useMapStore } from "../../stores/mapStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";
import { selectVesselList, useVesselStore } from "../../stores/vesselStore";
import { summariseAreaTraffic } from "../../traffic/trafficFilters";
import { AreaComparePanel } from "./AreaComparePanel";
import { MissionRoutinePanel } from "./MissionRoutinePanel";

const featuredAreaIds = [
  "hormuz",
  "english-channel",
  "portsmouth",
  "gibraltar",
  "suez",
  "taiwan-strait",
  "south-china-sea",
  "singapore"
];

export function OperationalAreaTools() {
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const vessels = useVesselStore(useShallow(selectVesselList));
  const areaOnlyMode = useMapStore((state) => state.areaOnlyMode);
  const areaSelection = useMapStore((state) => state.areaSelection);
  const clearAreaSelection = useMapStore((state) => state.clearAreaSelection);
  const selectOperationalArea = useMapStore((state) => state.selectOperationalArea);
  const setAreaOnlyMode = useMapStore((state) => state.setAreaOnlyMode);
  const addAreaMonitor = useAnomalyStore((state) => state.addAreaMonitor);
  const areaMonitors = useAnomalyStore((state) => state.areaMonitors);
  const removeAreaMonitor = useAnomalyStore((state) => state.removeAreaMonitor);
  const toggleAreaMonitor = useAnomalyStore((state) => state.toggleAreaMonitor);
  const draft = useTrafficRuleStore((state) => state.draft);
  const events = useTrafficRuleStore((state) => state.events);
  const lastError = useTrafficRuleStore((state) => state.lastError);
  const rules = useTrafficRuleStore((state) => state.rules);
  const addNaturalRule = useTrafficRuleStore((state) => state.addNaturalRule);
  const removeRule = useTrafficRuleStore((state) => state.removeRule);
  const setDraft = useTrafficRuleStore((state) => state.setDraft);
  const toggleRule = useTrafficRuleStore((state) => state.toggleRule);
  const featuredAreas = useMemo(() => {
    const featuredIds = new Set(featuredAreaIds);
    return [
      ...trafficAreaRegistry.filter((area) => featuredIds.has(area.id)),
      ...trafficAreaRegistry.filter((area) => !featuredIds.has(area.id))
    ];
  }, []);
  const summary = useMemo(
    () => summariseAreaTraffic(vessels, aircraft, areaSelection?.bounds ?? null),
    [aircraft, areaSelection, vessels]
  );
  const isAreaMonitored = areaSelection
    ? areaMonitors.some((monitor) => monitor.id === areaSelection.id && monitor.active)
    : false;

  function handleAreaSelect(areaId: string): void {
    const area = trafficAreaRegistry.find((candidate) => candidate.id === areaId);
    if (area) {
      selectOperationalArea(area);
    }
  }

  function handleRuleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const rule = addNaturalRule(draft);

    if (rule) {
      selectOperationalArea(rule.area);
      if (rule.areaOnly) {
        setAreaOnlyMode(true);
      }
    }
  }

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
          Operational area
        </p>
        {areaSelection ? (
          <button
            type="button"
            onClick={clearAreaSelection}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-500/[0.18] px-2 text-xs text-slate-300 transition hover:border-red-300/[0.45] hover:text-red-100"
          >
            <Trash2 size={13} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      <label htmlFor="operational-area-select" className="sr-only">
        Saved operational area
      </label>
      <select
        id="operational-area-select"
        value={areaSelection?.id ?? ""}
        onChange={(event) => handleAreaSelect(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-500/[0.20] bg-slate-950 px-3 text-sm text-slate-50 outline-none focus:border-cyan-300/[0.70] focus:ring-2 focus:ring-cyan-300/[0.22]"
      >
        <option value="">Select saved area</option>
        {featuredAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      {areaSelection ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AreaMetric label="Vessels" value={summary.vesselCount} />
          <AreaMetric label="Aircraft" value={summary.aircraftCount} />
          <AreaMetric label="High-risk ships" value={summary.highRiskVessels} />
          <AreaMetric label="Military air" value={summary.militaryAircraft} />
        </div>
      ) : null}

      <button
        type="button"
        disabled={!areaSelection}
        onClick={() => setAreaOnlyMode(!areaOnlyMode)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/[0.32] bg-cyan-300/[0.10] px-3 py-2 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/[0.16] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
      >
        {areaOnlyMode ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
        {areaOnlyMode ? "Showing selected area only" : "Show selected area only"}
      </button>

      <button
        type="button"
        disabled={!areaSelection}
        onClick={() => {
          if (areaSelection) {
            addAreaMonitor(areaSelection);
          }
        }}
        aria-pressed={isAreaMonitored}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-300/[0.32] bg-amber-300/[0.08] px-3 py-2 text-xs font-medium text-amber-50 transition hover:bg-amber-300/[0.14] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
      >
        <AlertTriangle size={14} aria-hidden="true" />
        {isAreaMonitored ? "Anomaly scan active" : "Monitor anomalies in area"}
      </button>

      <form onSubmit={handleRuleSubmit} className="mt-4">
        <label
          htmlFor="watch-rule"
          className="text-[11px] font-medium uppercase tracking-normal text-slate-400"
        >
          Natural watch rule
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="watch-rule"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-500/[0.18] bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/[0.55] focus:ring-2 focus:ring-cyan-300/[0.15]"
          />
          <button
            type="submit"
            disabled={draft.trim().length < 3}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.12] text-cyan-50 transition hover:bg-cyan-300/[0.18] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
            aria-label="Create watch rule"
            title="Create watch rule"
          >
            <Crosshair size={16} aria-hidden="true" />
          </button>
        </div>
        {lastError ? <p className="mt-2 text-xs leading-5 text-red-200">{lastError}</p> : null}
      </form>

      {rules.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onRemove={() => removeRule(rule.id)}
              onToggle={() => toggleRule(rule.id)}
            />
          ))}
        </div>
      ) : null}

      {areaMonitors.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
            Area anomaly monitors
          </p>
          {areaMonitors.slice(0, 5).map((monitor) => (
            <RuleRow
              key={monitor.id}
              rule={{
                active: monitor.active,
                area: { name: monitor.name },
                areaOnly: false,
                detail: "Anomaly scan",
                label: monitor.name
              }}
              onRemove={() => removeAreaMonitor(monitor.id)}
              onToggle={() => toggleAreaMonitor(monitor.id)}
            />
          ))}
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
            Recent area events
          </p>
          <div className="mt-2 space-y-1.5">
            {events.slice(0, 5).map((event) => (
              <p key={event.id} className="rounded bg-slate-950/[0.36] px-2.5 py-2 text-xs text-slate-300">
                {event.entityLabel} {event.eventType} {event.ruleLabel}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        <MissionRoutinePanel />
        <AreaComparePanel />
      </div>
    </section>
  );
}

function AreaMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-50">
        {value.toLocaleString("en-GB")}
      </p>
    </div>
  );
}

function RuleRow({
  onRemove,
  onToggle,
  rule
}: {
  onRemove(): void;
  onToggle(): void;
  rule: {
    active: boolean;
    area: Pick<TrafficAreaDefinition, "name">;
    areaOnly: boolean;
    detail?: string;
    label: string;
  };
}) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.34] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <MapPinned size={14} className="shrink-0 text-cyan-100" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-100">{rule.label}</p>
          <p className="text-[11px] text-slate-500">
            {rule.detail ?? (rule.areaOnly ? "Area-only filter" : "Highlight matches")}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-cyan-300/[0.42] hover:text-cyan-100"
          aria-label={rule.active ? "Pause rule" : "Resume rule"}
          title={rule.active ? "Pause rule" : "Resume rule"}
        >
          {rule.active ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-red-300/[0.45] hover:text-red-100"
          aria-label="Remove rule"
          title="Remove rule"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

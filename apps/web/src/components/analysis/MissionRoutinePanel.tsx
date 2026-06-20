import { Clock3, Play, Radar, Trash2 } from "lucide-react";
import { type FormEvent } from "react";
import { useAnomalyStore } from "../../stores/anomalyStore";
import { type MissionCadence, type MissionRoutine, useMissionStore } from "../../stores/missionStore";
import { useMapStore } from "../../stores/mapStore";
import { useTrafficRuleStore } from "../../stores/trafficRuleStore";

export function MissionRoutinePanel() {
  const addAreaMonitor = useAnomalyStore((state) => state.addAreaMonitor);
  const addNaturalRule = useTrafficRuleStore((state) => state.addNaturalRule);
  const selectOperationalArea = useMapStore((state) => state.selectOperationalArea);
  const draft = useMissionStore((state) => state.draft);
  const cadence = useMissionStore((state) => state.cadence);
  const anomalyDetection = useMissionStore((state) => state.anomalyDetection);
  const routines = useMissionStore((state) => state.routines);
  const lastError = useMissionStore((state) => state.lastError);
  const addRoutine = useMissionStore((state) => state.addRoutine);
  const removeRoutine = useMissionStore((state) => state.removeRoutine);
  const setAnomalyDetection = useMissionStore((state) => state.setAnomalyDetection);
  const setCadence = useMissionStore((state) => state.setCadence);
  const setDraft = useMissionStore((state) => state.setDraft);
  const toggleRoutine = useMissionStore((state) => state.toggleRoutine);
  const touchRoutine = useMissionStore((state) => state.touchRoutine);

  function saveRoutine(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    addRoutine(draft, { anomalyDetection, cadence });
  }

  function runRoutine(routine: MissionRoutine): void {
    addNaturalRule(routine.query);
    selectOperationalArea(routine.area);
    if (routine.anomalyDetection) {
      addAreaMonitor(routine.area);
    }
    touchRoutine(routine.id);
  }

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
        Mission routines
      </p>
      <form onSubmit={saveRoutine} className="mt-2 space-y-2">
        <label htmlFor="mission-routine" className="sr-only">
          Mission routine
        </label>
        <textarea
          id="mission-routine"
          rows={3}
          value={draft}
          maxLength={600}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-none rounded-md border border-slate-500/[0.18] bg-slate-950 px-3 py-2 text-sm leading-5 text-slate-100 outline-none focus:border-cyan-300/[0.55] focus:ring-2 focus:ring-cyan-300/[0.15]"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select
            value={cadence}
            onChange={(event) => setCadence(event.target.value as MissionCadence)}
            className="h-10 rounded-md border border-slate-500/[0.20] bg-slate-950 px-3 text-sm text-slate-50 outline-none focus:border-cyan-300/[0.70] focus:ring-2 focus:ring-cyan-300/[0.22]"
            aria-label="Routine cadence"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual</option>
          </select>
          <button
            type="button"
            onClick={() => setAnomalyDetection(!anomalyDetection)}
            aria-pressed={anomalyDetection}
            className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${
              anomalyDetection
                ? "border-amber-300/[0.48] bg-amber-300/[0.12] text-amber-100"
                : "border-slate-500/[0.18] text-slate-300 hover:border-amber-300/[0.38]"
            }`}
          >
            <Radar size={14} aria-hidden="true" />
            Anomaly
          </button>
        </div>
        <button
          type="submit"
          disabled={draft.trim().length < 3}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.12] px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/[0.18] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Clock3 size={15} aria-hidden="true" />
          Save routine
        </button>
        {lastError ? <p className="text-xs leading-5 text-red-200">{lastError}</p> : null}
      </form>

      {routines.length > 0 ? (
        <div className="mt-3 space-y-2">
          {routines.slice(0, 6).map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              onRemove={() => removeRoutine(routine.id)}
              onRun={() => runRoutine(routine)}
              onToggle={() => toggleRoutine(routine.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RoutineRow({
  onRemove,
  onRun,
  onToggle,
  routine
}: {
  onRemove(): void;
  onRun(): void;
  onToggle(): void;
  routine: MissionRoutine;
}) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.34] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggle} className="alert-action-button">
          {routine.active ? "Pause" : "Resume"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-100">{routine.title}</p>
          <p className="text-[11px] capitalize text-slate-500">
            {routine.cadence} {routine.anomalyDetection ? "with anomaly scan" : "watch only"}
          </p>
        </div>
        <button type="button" onClick={onRun} className="grid h-8 w-8 place-items-center rounded-md border border-cyan-300/[0.28] text-cyan-100 transition hover:bg-cyan-300/[0.10]" aria-label={`Run ${routine.title}`}>
          <Play size={13} aria-hidden="true" />
        </button>
        <button type="button" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] text-slate-300 transition hover:border-red-300/[0.45] hover:text-red-100" aria-label={`Remove ${routine.title}`}>
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

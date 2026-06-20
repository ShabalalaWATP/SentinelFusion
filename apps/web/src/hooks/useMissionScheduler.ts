import { useEffect } from "react";
import { useAnomalyStore } from "../stores/anomalyStore";
import { useMissionStore } from "../stores/missionStore";
import { useTrafficRuleStore } from "../stores/trafficRuleStore";

export function useMissionScheduler(): void {
  const routines = useMissionStore((state) => state.routines);
  const touchRoutine = useMissionStore((state) => state.touchRoutine);
  const addAreaMonitor = useAnomalyStore((state) => state.addAreaMonitor);
  const addNaturalRule = useTrafficRuleStore((state) => state.addNaturalRule);

  useEffect(() => {
    for (const routine of routines) {
      if (!routine.active || routine.cadence === "manual" || !isDue(routine.lastRunAt, routine.cadence)) {
        continue;
      }

      addNaturalRule(routine.query);
      if (routine.anomalyDetection) {
        addAreaMonitor(routine.area);
      }
      touchRoutine(routine.id);
    }
  }, [addAreaMonitor, addNaturalRule, routines, touchRoutine]);
}

function isDue(lastRunAt: string | undefined, cadence: "daily" | "weekly"): boolean {
  if (!lastRunAt) {
    return true;
  }

  const elapsedMs = Date.now() - new Date(lastRunAt).getTime();
  const dueAfterMs = cadence === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return elapsedMs >= dueAfterMs;
}

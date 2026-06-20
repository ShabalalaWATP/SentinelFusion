import { useEffect, useMemo, useRef } from "react";
import {
  type Aircraft,
  isGovernmentAircraft,
  isMilitaryAircraft,
  isClassifiedVessel
} from "@aisstream/shared";
import { useShallow } from "zustand/react/shallow";
import { useAircraftIntelStore } from "../stores/aircraftIntelStore";
import { selectAircraftList, useAircraftStore } from "../stores/aircraftStore";
import { useVesselIntelStore } from "../stores/vesselIntelStore";
import { selectVesselList, useVesselStore } from "../stores/vesselStore";

const AUTO_RESEARCH_INTERVAL_MS = 30000;

export function useAutoClassifiedIntel(): void {
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const vessels = useVesselStore(useShallow(selectVesselList));
  const queuedAircraftIdsRef = useRef<string[]>([]);
  const queuedIdsRef = useRef<string[]>([]);
  const aircraftProcessingRef = useRef(false);
  const processingRef = useRef(false);
  const classifiedAircraftIds = useMemo(
    () =>
      aircraft
        .filter((item) => {
          const identity = toAircraftIdentity(item);
          return isMilitaryAircraft(identity) || isGovernmentAircraft(identity);
        })
        .map((item) => item.id),
    [aircraft]
  );
  const classifiedIds = useMemo(
    () => vessels.filter(isClassifiedVessel).map((vessel) => vessel.id),
    [vessels]
  );

  useEffect(() => {
    const state = useVesselIntelStore.getState();
    const queued = new Set(queuedIdsRef.current);
    const nextIds = classifiedIds.filter((id) =>
      shouldQueueAutoClassifiedIntel(Boolean(state.results[id]), state.statuses[id], queued.has(id))
    );

    queuedIdsRef.current = [...queuedIdsRef.current, ...nextIds];
  }, [classifiedIds]);

  useEffect(() => {
    const state = useAircraftIntelStore.getState();
    const queued = new Set(queuedAircraftIdsRef.current);
    const nextIds = classifiedAircraftIds.filter((id) =>
      shouldQueueAutoClassifiedIntel(Boolean(state.results[id]), state.statuses[id], queued.has(id))
    );

    queuedAircraftIdsRef.current = [...queuedAircraftIdsRef.current, ...nextIds];
  }, [classifiedAircraftIds]);

  useEffect(() => {
    const processNext = () => {
      if (processingRef.current) {
        return;
      }

      const nextId = queuedIdsRef.current.shift();
      if (!nextId) {
        return;
      }

      const state = useVesselIntelStore.getState();
      if (state.results[nextId] || state.statuses[nextId] === "loading") {
        return;
      }

      processingRef.current = true;
      void state.research(nextId, undefined, { silent: true }).finally(() => {
        processingRef.current = false;
      });
    };
    const processNextAircraft = () => {
      if (aircraftProcessingRef.current) {
        return;
      }

      const nextId = queuedAircraftIdsRef.current.shift();
      if (!nextId) {
        return;
      }

      const state = useAircraftIntelStore.getState();
      if (state.results[nextId] || state.statuses[nextId] === "loading") {
        return;
      }

      aircraftProcessingRef.current = true;
      void state.research(nextId, undefined, { silent: true }).finally(() => {
        aircraftProcessingRef.current = false;
      });
    };
    const initialTimer = window.setTimeout(processNext, 1500);
    const initialAircraftTimer = window.setTimeout(processNextAircraft, 2500);
    const timer = window.setInterval(processNext, AUTO_RESEARCH_INTERVAL_MS);
    const aircraftTimer = window.setInterval(
      processNextAircraft,
      AUTO_RESEARCH_INTERVAL_MS
    );

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(initialAircraftTimer);
      window.clearInterval(timer);
      window.clearInterval(aircraftTimer);
    };
  }, []);
}

export function shouldQueueAutoClassifiedIntel(
  hasResult: boolean,
  status: string | undefined,
  isQueued: boolean
): boolean {
  return !hasResult && !isQueued && (status === undefined || status === "idle");
}

function toAircraftIdentity(aircraft: Aircraft): Parameters<typeof isMilitaryAircraft>[0] {
  return {
    ...(aircraft.aircraftType ? { aircraftType: aircraft.aircraftType } : {}),
    ...(aircraft.callsign ? { callsign: aircraft.callsign } : {}),
    ...(aircraft.category ? { category: aircraft.category } : {}),
    ...(aircraft.operator ? { operator: aircraft.operator } : {}),
    ...(aircraft.registration ? { registration: aircraft.registration } : {})
  };
}

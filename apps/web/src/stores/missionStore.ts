import { create } from "zustand";
import type { TrafficAreaDefinition } from "@aisstream/shared";
import { parseNaturalRule, type TrafficWatchRule } from "./trafficRuleStore";
import { readLocalJson, writeLocalJson } from "./localStore";
import type { TrafficDomain } from "../traffic/trafficFilters";

export type MissionCadence = "daily" | "weekly" | "manual";

export type MissionRoutine = {
  id: string;
  title: string;
  query: string;
  cadence: MissionCadence;
  domain: TrafficDomain;
  area: TrafficAreaDefinition;
  anomalyDetection: boolean;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
};

type MissionState = {
  draft: string;
  cadence: MissionCadence;
  anomalyDetection: boolean;
  routines: MissionRoutine[];
  lastError: string | null;
  addRoutine(query: string, options?: { anomalyDetection?: boolean; cadence?: MissionCadence }): MissionRoutine | null;
  removeRoutine(id: string): void;
  setAnomalyDetection(enabled: boolean): void;
  setCadence(cadence: MissionCadence): void;
  setDraft(value: string): void;
  toggleRoutine(id: string): void;
  touchRoutine(id: string): void;
};

const storageKey = "aisstream.missionRoutines.v1";

export const useMissionStore = create<MissionState>((set) => ({
  draft: "Examine all vessels and aircraft in the vicinity of the Hormuz Strait",
  cadence: "daily",
  anomalyDetection: true,
  routines: readLocalJson<MissionRoutine[]>(storageKey, [], isMissionRoutineArray),
  lastError: null,
  addRoutine: (query, options) => {
    const parsed = parseNaturalRule(query);

    if (!parsed) {
      set({ lastError: "I could not match that routine to a known operating area." });
      return null;
    }

    const now = new Date().toISOString();
    const routine: MissionRoutine = {
      id: `${parsed.area.id}-${parsed.domain}-${slug(query)}`,
      title: missionTitle(parsed),
      query: query.trim(),
      cadence: options?.cadence ?? "daily",
      domain: parsed.domain,
      area: parsed.area,
      anomalyDetection: options?.anomalyDetection ?? true,
      active: true,
      createdAt: now
    };

    set((state) => ({
      draft: "",
      lastError: null,
      routines: persistRoutines([
        routine,
        ...state.routines.filter((item) => item.id !== routine.id)
      ])
    }));
    return routine;
  },
  removeRoutine: (id) =>
    set((state) => ({
      routines: persistRoutines(state.routines.filter((routine) => routine.id !== id))
    })),
  setAnomalyDetection: (anomalyDetection) => set({ anomalyDetection }),
  setCadence: (cadence) => set({ cadence }),
  setDraft: (draft) => set({ draft }),
  toggleRoutine: (id) =>
    set((state) => ({
      routines: persistRoutines(
        state.routines.map((routine) =>
          routine.id === id ? { ...routine, active: !routine.active } : routine
        )
      )
    })),
  touchRoutine: (id) =>
    set((state) => ({
      routines: persistRoutines(
        state.routines.map((routine) =>
          routine.id === id ? { ...routine, lastRunAt: new Date().toISOString() } : routine
        )
      )
    }))
}));

function persistRoutines(routines: MissionRoutine[]): MissionRoutine[] {
  writeLocalJson(storageKey, routines);
  return routines;
}

function isMissionRoutineArray(value: unknown): value is MissionRoutine[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const candidate = item as Partial<MissionRoutine>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.query === "string" &&
      typeof candidate.title === "string" &&
      ["daily", "weekly", "manual"].includes(String(candidate.cadence)) &&
      ["all", "vessels", "aircraft"].includes(String(candidate.domain)) &&
      typeof candidate.area === "object" &&
      candidate.area !== null &&
      typeof candidate.active === "boolean"
    );
  });
}

function missionTitle(rule: TrafficWatchRule): string {
  return `${domainLabel(rule.domain)} routine: ${rule.area.name}`;
}

function domainLabel(domain: TrafficDomain): string {
  if (domain === "aircraft") {
    return "Aircraft";
  }

  if (domain === "vessels") {
    return "Vessels";
  }

  return "All traffic";
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

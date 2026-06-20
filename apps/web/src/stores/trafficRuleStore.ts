import {
  normaliseTrafficText,
  resolveTrafficAreaByText,
  type TrafficAreaDefinition
} from "@aisstream/shared";
import { create } from "zustand";
import type { TrafficDomain, TrafficEntityDomain } from "../traffic/trafficFilters";
import { readLocalJson, writeLocalJson } from "./localStore";

export type TrafficWatchRule = {
  id: string;
  query: string;
  label: string;
  domain: TrafficDomain;
  area: TrafficAreaDefinition;
  areaOnly: boolean;
  active: boolean;
  createdAt: string;
};

export type TrafficRuleEvent = {
  id: string;
  ruleId: string;
  ruleLabel: string;
  entityId: string;
  entityLabel: string;
  entityDomain: TrafficEntityDomain;
  eventType: "entered" | "left";
  occurredAt: string;
};

type TrafficRuleState = {
  draft: string;
  rules: TrafficWatchRule[];
  events: TrafficRuleEvent[];
  lastError: string | null;
  addNaturalRule(query: string): TrafficWatchRule | null;
  clearEvents(): void;
  removeRule(id: string): void;
  recordEvents(events: TrafficRuleEvent[]): void;
  setDraft(value: string): void;
  toggleRule(id: string): void;
};

const maxEvents = 40;
const rulesStorageKey = "aisstream.savedWatchRules.v1";

function isTrafficWatchRuleArray(value: unknown): value is TrafficWatchRule[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const candidate = item as Partial<TrafficWatchRule>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.query === "string" &&
      typeof candidate.label === "string" &&
      ["all", "vessels", "aircraft"].includes(String(candidate.domain)) &&
      typeof candidate.area === "object" &&
      candidate.area !== null &&
      typeof candidate.active === "boolean"
    );
  });
}

function persistRules(rules: TrafficWatchRule[]): TrafficWatchRule[] {
  writeLocalJson(rulesStorageKey, rules);
  return rules;
}

export const useTrafficRuleStore = create<TrafficRuleState>((set) => ({
  draft: "Track all activity across the Strait of Hormuz and highlight it",
  rules: readLocalJson<TrafficWatchRule[]>(rulesStorageKey, [], isTrafficWatchRuleArray),
  events: [],
  lastError: null,
  addNaturalRule: (query) => {
    const parsed = parseNaturalRule(query);

    if (!parsed) {
      set({
        lastError: "I could not match that rule to a known operating area."
      });
      return null;
    }

    set((state) => ({
      draft: "",
      lastError: null,
      rules: persistRules([parsed, ...state.rules.filter((rule) => rule.id !== parsed.id)])
    }));
    return parsed;
  },
  clearEvents: () => set({ events: [] }),
  removeRule: (id) =>
    set((state) => ({
      rules: persistRules(state.rules.filter((rule) => rule.id !== id)),
      events: state.events.filter((event) => event.ruleId !== id)
    })),
  recordEvents: (events) =>
    set((state) => ({
      events: [...events, ...state.events].slice(0, maxEvents)
    })),
  setDraft: (draft) => set({ draft }),
  toggleRule: (id) =>
    set((state) => ({
      rules: persistRules(state.rules.map((rule) =>
        rule.id === id ? { ...rule, active: !rule.active } : rule
      ))
    }))
}));

export function parseNaturalRule(query: string): TrafficWatchRule | null {
  const match = resolveTrafficAreaByText(query);

  if (!match) {
    return null;
  }

  const normalised = normaliseTrafficText(query);
  const domain = inferDomain(normalised);
  const areaOnly = /\b(?:only|hide|filter|inside|within|exclusive)\b/.test(normalised);
  const label = `${domainLabel(domain)} in ${match.area.name}`;

  return {
    id: `${match.area.id}-${domain}`,
    query: query.trim(),
    label,
    domain,
    area: match.area,
    areaOnly,
    active: true,
    createdAt: new Date().toISOString()
  };
}

function inferDomain(normalised: string): TrafficDomain {
  const mentionsAircraft = /\b(?:aircraft|flight|flights|plane|planes|air)\b/.test(normalised);
  const mentionsVessels = /\b(?:vessel|vessels|ship|ships|boat|boats|maritime|ais)\b/.test(normalised);

  if (mentionsAircraft && !mentionsVessels) {
    return "aircraft";
  }

  if (mentionsVessels && !mentionsAircraft) {
    return "vessels";
  }

  return "all";
}

function domainLabel(domain: TrafficDomain): string {
  if (domain === "aircraft") {
    return "Aircraft activity";
  }

  if (domain === "vessels") {
    return "Vessel activity";
  }

  return "All traffic";
}

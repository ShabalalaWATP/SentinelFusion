import { create } from "zustand";
import type { TrafficAreaBounds } from "@aisstream/shared";
import { readLocalJson, writeLocalJson } from "./localStore";

type MonitoredEntityDomain = "vessel" | "aircraft";

export type AreaAnomalyMonitor = {
  id: string;
  name: string;
  bounds: TrafficAreaBounds;
  active: boolean;
  createdAt: string;
};

export type EntityAnomalyMonitor = {
  id: string;
  domain: MonitoredEntityDomain;
  active: boolean;
  createdAt: string;
};

type AnomalyState = {
  areaMonitors: AreaAnomalyMonitor[];
  entityMonitors: EntityAnomalyMonitor[];
  addAreaMonitor(area: { id: string; name: string; bounds: TrafficAreaBounds }): void;
  removeAreaMonitor(id: string): void;
  toggleAreaMonitor(id: string): void;
  toggleEntityMonitor(domain: MonitoredEntityDomain, id: string): void;
  isEntityMonitored(domain: MonitoredEntityDomain, id: string): boolean;
};

const areaStorageKey = "aisstream.areaAnomalyMonitors.v1";
const entityStorageKey = "aisstream.entityAnomalyMonitors.v1";

export const useAnomalyStore = create<AnomalyState>((set, get) => ({
  areaMonitors: readLocalJson<AreaAnomalyMonitor[]>(areaStorageKey, [], isAreaMonitorArray),
  entityMonitors: readLocalJson<EntityAnomalyMonitor[]>(entityStorageKey, [], isEntityMonitorArray),
  addAreaMonitor: (area) =>
    set((state) => ({
      areaMonitors: persistAreas([
        {
          ...area,
          active: true,
          createdAt: new Date().toISOString()
        },
        ...state.areaMonitors.filter((monitor) => monitor.id !== area.id)
      ])
    })),
  removeAreaMonitor: (id) =>
    set((state) => ({
      areaMonitors: persistAreas(state.areaMonitors.filter((monitor) => monitor.id !== id))
    })),
  toggleAreaMonitor: (id) =>
    set((state) => ({
      areaMonitors: persistAreas(
        state.areaMonitors.map((monitor) =>
          monitor.id === id ? { ...monitor, active: !monitor.active } : monitor
        )
      )
    })),
  toggleEntityMonitor: (domain, id) =>
    set((state) => {
      const existing = state.entityMonitors.find(
        (monitor) => monitor.domain === domain && monitor.id === id
      );
      const entityMonitors = existing
        ? state.entityMonitors.map((monitor) =>
            monitor.domain === domain && monitor.id === id
              ? { ...monitor, active: !monitor.active }
              : monitor
          )
        : [
            {
              id,
              domain,
              active: true,
              createdAt: new Date().toISOString()
            },
            ...state.entityMonitors
          ];

      return { entityMonitors: persistEntities(entityMonitors) };
    }),
  isEntityMonitored: (domain, id) =>
    get().entityMonitors.some(
      (monitor) => monitor.domain === domain && monitor.id === id && monitor.active
    )
}));

function persistAreas(monitors: AreaAnomalyMonitor[]): AreaAnomalyMonitor[] {
  writeLocalJson(areaStorageKey, monitors);
  return monitors;
}

function persistEntities(monitors: EntityAnomalyMonitor[]): EntityAnomalyMonitor[] {
  writeLocalJson(entityStorageKey, monitors);
  return monitors;
}

function isAreaMonitorArray(value: unknown): value is AreaAnomalyMonitor[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const candidate = item as Partial<AreaAnomalyMonitor>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.bounds === "object" &&
      candidate.bounds !== null &&
      typeof candidate.active === "boolean"
    );
  });
}

function isEntityMonitorArray(value: unknown): value is EntityAnomalyMonitor[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const candidate = item as Partial<EntityAnomalyMonitor>;
    return (
      typeof candidate.id === "string" &&
      ["vessel", "aircraft"].includes(String(candidate.domain)) &&
      typeof candidate.active === "boolean"
    );
  });
}

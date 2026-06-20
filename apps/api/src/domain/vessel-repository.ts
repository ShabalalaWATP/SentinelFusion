import type { Vessel } from "@aisstream/shared";
import type { IVesselRepository } from "./interfaces";

const DEFAULT_SNAPSHOT_LIMIT = 6000;
const DEFAULT_SNAPSHOT_TRACK_POINTS = 20;
const DEFAULT_RETENTION_LIMIT = 18000;
const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000;

export class InMemoryVesselRepository implements IVesselRepository {
  private readonly vessels = new Map<string, Vessel>();

  getAll(): Vessel[] {
    return [...this.vessels.values()]
      .sort(compareNewestFirst)
      .slice(0, DEFAULT_SNAPSHOT_LIMIT)
      .map(trimTrack)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getById(id: string): Vessel | undefined {
    return this.vessels.get(id);
  }

  prune(now = new Date()): number {
    const cutoff = now.getTime() - DEFAULT_STALE_AFTER_MS;
    let removed = 0;

    for (const [id, vessel] of this.vessels) {
      const updatedAt = Date.parse(vessel.lastUpdated);
      if (Number.isFinite(updatedAt) && updatedAt < cutoff) {
        this.vessels.delete(id);
        removed += 1;
      }
    }

    if (this.vessels.size <= DEFAULT_RETENTION_LIMIT) {
      return removed;
    }

    const excess = [...this.vessels.values()]
      .sort(compareNewestFirst)
      .slice(DEFAULT_RETENTION_LIMIT);

    excess.forEach((vessel) => {
      if (this.vessels.delete(vessel.id)) {
        removed += 1;
      }
    });

    return removed;
  }

  upsert(vessel: Vessel): Vessel {
    this.vessels.set(vessel.id, vessel);
    return vessel;
  }
}

function compareNewestFirst(left: Vessel, right: Vessel): number {
  return Date.parse(right.lastUpdated) - Date.parse(left.lastUpdated);
}

function trimTrack(vessel: Vessel): Vessel {
  return {
    ...vessel,
    track: vessel.track.slice(-DEFAULT_SNAPSHOT_TRACK_POINTS)
  };
}

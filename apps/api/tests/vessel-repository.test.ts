import { describe, expect, it } from "vitest";
import type { Vessel } from "@aisstream/shared";
import { InMemoryVesselRepository } from "../src/domain/vessel-repository";

const now = new Date("2026-06-16T15:00:00.000Z");

describe("vessel repository", () => {
  it("returns a bounded recent snapshot with trimmed tracks", () => {
    const repository = new InMemoryVesselRepository();

    for (let index = 0; index < 6100; index += 1) {
      repository.upsert(
        sampleVessel({
          id: `mmsi-${String(200000000 + index)}`,
          mmsi: String(200000000 + index),
          name: `VESSEL ${String(index).padStart(4, "0")}`,
          lastUpdated: new Date(now.getTime() + index * 1000).toISOString(),
          track: Array.from({ length: 80 }, (_, pointIndex) => ({
            longitude: -1 + pointIndex * 0.001,
            latitude: 50 + pointIndex * 0.001,
            timestamp: new Date(now.getTime() + pointIndex * 1000).toISOString()
          }))
        })
      );
    }

    const snapshot = repository.getAll();

    expect(snapshot).toHaveLength(6000);
    expect(snapshot.every((vessel) => vessel.track.length <= 20)).toBe(true);
    expect(snapshot.some((vessel) => vessel.id === "mmsi-200000000")).toBe(false);
  });

  it("prunes stale vessels", () => {
    const repository = new InMemoryVesselRepository();
    repository.upsert(
      sampleVessel({
        id: "mmsi-200000001",
        mmsi: "200000001",
        lastUpdated: new Date(now.getTime() - 31 * 60 * 1000).toISOString()
      })
    );
    repository.upsert(
      sampleVessel({
        id: "mmsi-200000002",
        mmsi: "200000002",
        lastUpdated: now.toISOString()
      })
    );

    expect(repository.prune(now)).toBe(1);
    expect(repository.getById("mmsi-200000001")).toBeUndefined();
    expect(repository.getById("mmsi-200000002")).toBeTruthy();
  });

  it("keeps vessels with invalid timestamps during stale pruning", () => {
    const repository = new InMemoryVesselRepository();

    repository.upsert(
      sampleVessel({
        id: "mmsi-invalid-time",
        mmsi: "999000001",
        lastUpdated: "not-a-date"
      })
    );

    expect(repository.prune(now)).toBe(0);
    expect(repository.getById("mmsi-invalid-time")).toBeTruthy();
  });

  it("prunes excess vessels over the retention limit", () => {
    const repository = new InMemoryVesselRepository();

    for (let index = 0; index < 18005; index += 1) {
      repository.upsert(
        sampleVessel({
          id: `mmsi-${String(300000000 + index)}`,
          mmsi: String(300000000 + index),
          lastUpdated: new Date(now.getTime() + index * 1000).toISOString()
        })
      );
    }

    const removed = repository.prune(now);

    expect(removed).toBeGreaterThan(0);
    expect(repository.getById("mmsi-300000000")).toBeUndefined();
    expect(repository.getById("mmsi-300018004")).toBeTruthy();
  });
});

function sampleVessel(overrides: Partial<Vessel> = {}): Vessel {
  return {
    id: "mmsi-200000000",
    mmsi: "200000000",
    name: "TEST VESSEL",
    shipType: "Cargo",
    longitude: -1,
    latitude: 50,
    speedOverGround: 10,
    courseOverGround: 90,
    navigationalStatus: "Under way using engine",
    riskLevel: "low",
    lastUpdated: now.toISOString(),
    track: [{ longitude: -1, latitude: 50, timestamp: now.toISOString() }],
    ...overrides
  };
}

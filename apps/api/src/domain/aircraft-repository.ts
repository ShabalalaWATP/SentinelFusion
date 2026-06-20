import type { Aircraft } from "@aisstream/shared";
import type { IAircraftRepository } from "./interfaces";

export class InMemoryAircraftRepository implements IAircraftRepository {
  private readonly aircraft = new Map<string, Aircraft>();

  getAll(): Aircraft[] {
    return [...this.aircraft.values()].sort((left, right) =>
      aircraftLabel(left).localeCompare(aircraftLabel(right))
    );
  }

  getById(id: string): Aircraft | undefined {
    return this.aircraft.get(id);
  }

  replaceAll(aircraft: Aircraft[]): Aircraft[] {
    this.aircraft.clear();
    return this.upsertMany(aircraft);
  }

  upsert(aircraft: Aircraft): Aircraft {
    this.aircraft.set(aircraft.id, aircraft);
    return aircraft;
  }

  upsertMany(aircraft: Aircraft[]): Aircraft[] {
    aircraft.forEach((item) => this.upsert(item));
    return aircraft;
  }
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24;
}

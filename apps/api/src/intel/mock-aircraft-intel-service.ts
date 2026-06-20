import type { Aircraft, AircraftIntelResponse } from "@aisstream/shared";
import { aircraftIntelResponseSchema, classifyAircraft } from "@aisstream/shared";
import type { IAircraftIntelService } from "../domain/interfaces";
import { buildLocalFacts } from "./aircraft-intel-response";

export class MockAircraftIntelService implements IAircraftIntelService {
  async enrich(aircraft: Aircraft): Promise<AircraftIntelResponse> {
    return aircraftIntelResponseSchema.parse({
      status: "ok",
      mode: "mock",
      model: "deterministic-local",
      aircraftId: aircraft.id,
      profile: {
        matchedCallsign: aircraft.callsign,
        icao24: aircraft.icao24,
        registration: aircraft.registration,
        aircraftType: aircraft.aircraftType,
        classification: classifyAircraft(toAircraftIdentity(aircraft)),
        operator: aircraft.operator,
        confidence: "low"
      },
      summary: `${aircraftLabel(aircraft)} is currently represented by ADS-B telemetry only. No external web search was run in mock mode.`,
      facts: buildLocalFacts(aircraft),
      sources: [],
      limitations: [
        "This is deterministic local intel, not a live web search.",
        "ADS-B callsigns, registrations, aircraft types, and positions can be delayed, incomplete, spoofed, or ambiguous."
      ],
      generatedAt: new Date().toISOString()
    });
  }
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
}

function toAircraftIdentity(aircraft: Aircraft): Parameters<typeof classifyAircraft>[0] {
  return {
    ...(aircraft.aircraftType ? { aircraftType: aircraft.aircraftType } : {}),
    ...(aircraft.callsign ? { callsign: aircraft.callsign } : {}),
    ...(aircraft.category ? { category: aircraft.category } : {}),
    ...(aircraft.operator ? { operator: aircraft.operator } : {}),
    ...(aircraft.registration ? { registration: aircraft.registration } : {})
  };
}

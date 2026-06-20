import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import {
  defaultFeedConfidenceSettings,
  filterByFeedConfidence,
  isContactStale,
  isFeedHealthy
} from "./feedConfidence";

const now = Date.parse("2026-06-11T10:00:00.000Z");
const fresh = "2026-06-11T09:56:00.000Z";
const stale = "2026-06-11T09:20:00.000Z";

const vessel: Vessel = {
  id: "mmsi-123456789",
  mmsi: "123456789",
  name: "FRESH VESSEL",
  shipType: "Cargo",
  longitude: 1,
  latitude: 50,
  speedOverGround: 12,
  courseOverGround: 90,
  navigationalStatus: "Under way",
  riskLevel: "low",
  lastUpdated: fresh,
  track: []
};

const staleVessel: Vessel = {
  ...vessel,
  id: "mmsi-987654321",
  mmsi: "987654321",
  name: "STALE VESSEL",
  lastUpdated: stale
};

const aircraft: Aircraft = {
  id: "icao24-40621b",
  icao24: "40621b",
  callsign: "BAW12",
  longitude: 1,
  latitude: 50,
  emergency: false,
  onGround: false,
  classification: "commercial",
  riskLevel: "low",
  source: "mock",
  lastUpdated: fresh,
  track: []
};

const staleAircraft: Aircraft = {
  ...aircraft,
  id: "icao24-43c6f1",
  icao24: "43c6f1",
  callsign: "RFR7182",
  lastUpdated: stale
};

describe("feedConfidence", () => {
  it("detects unhealthy feed states", () => {
    const healthyStatus = {
      connected: true,
      lastMessageAt: fresh,
      messagesNormalised: 1,
      messagesReceived: 1,
      state: "subscribed"
    };

    expect(
      isFeedHealthy({
        connectionStatus: "open",
        lastError: null,
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: healthyStatus
      })
    ).toBe(true);
    expect(
      isFeedHealthy({
        connectionStatus: "open",
        lastError: null,
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: { ...healthyStatus, connected: false }
      })
    ).toBe(false);
    expect(
      isFeedHealthy({
        connectionStatus: "error",
        lastError: null,
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: healthyStatus
      })
    ).toBe(false);
    expect(
      isFeedHealthy({
        connectionStatus: "open",
        lastError: "HTTP 429",
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: healthyStatus
      })
    ).toBe(false);
    expect(
      isFeedHealthy({
        connectionStatus: "open",
        lastError: null,
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: { ...healthyStatus, lastMessageAt: stale }
      })
    ).toBe(false);
    expect(
      isFeedHealthy({
        connectionStatus: "open",
        lastError: null,
        maxMessageAgeMinutes: 10,
        nowMs: now,
        streamStatus: { ...healthyStatus, messagesNormalised: 0 }
      })
    ).toBe(false);
  });

  it("filters stale contacts while preserving selected stale contacts", () => {
    const result = filterByFeedConfidence(
      [vessel, staleVessel],
      [aircraft, staleAircraft],
      {
        feedHealth: { aircraftHealthy: true, nowMs: now, vesselsHealthy: true },
        selectedAircraftId: staleAircraft.id,
        selectedVesselId: staleVessel.id,
        settings: {
          ...defaultFeedConfidenceSettings,
          hideStaleContacts: true,
          maxContactAgeMinutes: 10
        }
      }
    );

    expect(result.vessels).toEqual([vessel, staleVessel]);
    expect(result.aircraft).toEqual([aircraft, staleAircraft]);
    expect(isContactStale(staleVessel, 10, now)).toBe(true);
  });

  it("hides domains with unhealthy feeds when requested", () => {
    const result = filterByFeedConfidence([vessel], [aircraft], {
      feedHealth: { aircraftHealthy: true, nowMs: now, vesselsHealthy: false },
      settings: {
        ...defaultFeedConfidenceSettings,
        hideUnhealthyFeeds: true
      }
    });

    expect(result.vessels).toEqual([]);
    expect(result.aircraft).toEqual([aircraft]);
  });
});

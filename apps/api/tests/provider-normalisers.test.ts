import { describe, expect, it } from "vitest";
import { normaliseAcledResponse } from "../src/context/acled-normaliser";
import { normaliseFirmsCsv } from "../src/context/firms-normaliser";

describe("ACLED normaliser", () => {
  it("ignores malformed rows and normalises optional conflict metadata", () => {
    const result = normaliseAcledResponse(
      {
        data: [
          null,
          "not a row",
          {
            event_id_no_cnty: "1001",
            event_date: "2026-06-20T00:00:00Z",
            disorder_type: "Strategic developments",
            event_type: "Strategic developments",
            sub_event_type: "Disrupted weapons use",
            country: "Testland",
            admin1: "Coastal Province",
            admin2: "Harbour District",
            location: "Port area",
            latitude: 50.8,
            longitude: "-1.1",
            geo_precision: 3,
            source: "Harbour bulletin",
            source_scale: "Local partner",
            fatalities: "-4",
            notes: "x".repeat(650)
          },
          {
            event_id_cnty: "DROP-MISSING-LOCATION",
            event_date: "2026-06-20",
            event_type: "Protests",
            latitude: "50.8",
            longitude: "-1.1"
          },
          {
            event_id_cnty: "BATTLE-1",
            event_date: "2026-06-19",
            event_type: "Battles",
            location: "Outer anchorage",
            latitude: "50.7",
            longitude: "-1.2",
            geo_precision: "2",
            fatalities: "2"
          },
          {
            event_id_cnty: "ROUTINE-1",
            event_date: "2026-06-18",
            event_type: "Other event",
            location: "Town centre",
            latitude: "50.6",
            longitude: "-1.3",
            geo_precision: "not numeric",
            fatalities: "0"
          }
        ]
      },
      10
    );

    expect(result.providerRows).toBe(4);
    expect(result.truncated).toBe(false);
    expect(result.events).toHaveLength(3);
    expect(result.events[0]).toMatchObject({
      id: "1001",
      eventDate: "2026-06-20",
      severity: "medium",
      geocodingConfidence: "low",
      fatalities: 0,
      adminArea: "Coastal Province, Harbour District"
    });
    expect(result.events[0]?.notes).toHaveLength(600);
    expect(result.events[0]?.notes.endsWith("...")).toBe(true);
    expect(result.events[1]).toMatchObject({
      id: "BATTLE-1",
      severity: "high",
      geocodingConfidence: "medium",
      fatalities: 2
    });
    expect(result.events[2]).toMatchObject({
      id: "ROUTINE-1",
      severity: "low",
      geocodingConfidence: "unknown"
    });
  });

  it("handles non-object payloads and caps provider rows before normalisation", () => {
    expect(normaliseAcledResponse(null, 10)).toEqual({
      events: [],
      providerRows: 0,
      truncated: false
    });
    expect(normaliseAcledResponse({ data: "bad" }, 10)).toEqual({
      events: [],
      providerRows: 0,
      truncated: false
    });

    const result = normaliseAcledResponse(
      {
        data: [
          {
            event_id_cnty: "FIRST",
            event_date: "2026-06-20",
            event_type: "Protests",
            location: "Portsmouth",
            latitude: "50.8",
            longitude: "-1.1"
          },
          {
            event_id_cnty: "SECOND",
            event_date: "2026-06-21",
            event_type: "Protests",
            location: "Portsmouth",
            latitude: "50.9",
            longitude: "-1.2"
          }
        ]
      },
      1
    );

    expect(result.providerRows).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.events.map((event) => event.id)).toEqual(["FIRST"]);
  });
});

describe("FIRMS normaliser", () => {
  it("normalises confidence, day/night, brightness aliases, blank rows, and invalid acquisitions", () => {
    const csv = [
      "latitude,longitude,acq_date,acq_time,confidence,satellite,instrument,version,daynight,brightness,frp,scan,track",
      "",
      "50.800,-1.100,2026-06-10,0030,normal,Aqua,MODIS,1.0,x,301.2,,0.3,0.4",
      "50.810,-1.120,2026-06-10,2359,29,Terra,MODIS,1.0,N,305.2,8.4,,",
      "50.820,-1.130,2026-06-10,2460,high,Terra,MODIS,1.0,D,310.0,12.2,0.5,0.6",
      "bad,-1.140,2026-06-10,0100,low,Terra,MODIS,1.0,D,300.0,2.0,0.1,0.2"
    ].join("\n");

    const result = normaliseFirmsCsv(csv, "MODIS_NRT", 10);

    expect(result.providerRows).toBe(4);
    expect(result.truncated).toBe(false);
    expect(result.detections).toHaveLength(2);
    expect(result.detections[0]).toMatchObject({
      confidence: "nominal",
      rawConfidence: "normal",
      dayNight: "unknown",
      brightnessKelvin: 301.2,
      scanKm: 0.3,
      trackKm: 0.4
    });
    expect(result.detections[0]?.fireRadiativePowerMw).toBeUndefined();
    expect(result.detections[1]).toMatchObject({
      confidence: "low",
      dayNight: "night",
      fireRadiativePowerMw: 8.4
    });
  });
});

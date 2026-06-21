import { describe, expect, it } from "vitest";
import type { Aircraft, Vessel } from "@aisstream/shared";
import {
  buildLocalFacts as buildAircraftLocalFacts,
  extractImages as extractAircraftImages,
  extractStructuredOutput as extractAircraftStructuredOutput,
  modelAircraftIntelSchema,
  normaliseModelIntel as normaliseAircraftModelIntel,
  safeErrorMessage as safeAircraftErrorMessage
} from "../src/intel/aircraft-intel-response";
import {
  buildLocalFacts as buildVesselLocalFacts,
  extractImages as extractVesselImages,
  extractStructuredOutput as extractVesselStructuredOutput,
  modelVesselIntelSchema,
  normaliseModelIntel as normaliseVesselModelIntel,
  safeErrorMessage as safeVesselErrorMessage
} from "../src/intel/vessel-intel-response";

const vessel: Vessel = {
  id: "vessel-232001234",
  mmsi: "232001234",
  name: "NORTHERN LIGHT",
  callSign: "NTHLT",
  shipType: "Cargo",
  latitude: 51.95,
  longitude: 1.3,
  speedOverGround: 13.2,
  courseOverGround: 76,
  heading: 74,
  destination: "Rotterdam",
  navigationalStatus: "Under way using engine",
  timestamp: "2026-06-11T10:00:00.000Z",
  lastUpdated: "2026-06-11T10:00:00.000Z",
  track: []
};

const aircraft: Aircraft = {
  id: "aircraft-abc123",
  icao24: "abc123",
  callsign: "RFR123",
  registration: "ZZ123",
  aircraftType: "A400M",
  classification: "military",
  operator: "Royal Air Force",
  latitude: 50.8,
  longitude: -1.1,
  altitudeFt: 22000,
  groundSpeedKt: 320,
  headingDeg: 90,
  squawk: "7000",
  verticalRateFpm: 0,
  timestamp: "2026-06-11T10:00:00.000Z",
  lastUpdated: "2026-06-11T10:00:00.000Z",
  track: []
};

describe("vessel intel response helpers", () => {
  it("extracts structured output from every supported OpenAI response shape", () => {
    const parsed = { summary: "parsed" };

    expect(extractVesselStructuredOutput({ output_parsed: parsed })).toBe(parsed);
    expect(extractVesselStructuredOutput({ output_text: "{\"summary\":\"text\"}" })).toEqual({
      summary: "text"
    });
    expect(
      extractVesselStructuredOutput({
        output: [{ content: [{ text: "{\"summary\":\"content\"}" }] }]
      })
    ).toEqual({ summary: "content" });
    expect(() => extractVesselStructuredOutput({ output: [{ content: [{}] }] })).toThrow(
      "structured vessel intel"
    );
  });

  it("deduplicates search images, sources, and compact profile fields", () => {
    const modelValue = modelVesselIntelSchema.parse({
      profile: {
        matchedName: "Northern Light",
        imo: null,
        mmsi: "232001234",
        callSign: "NTHLT",
        flag: "United Kingdom",
        vesselType: "Cargo",
        militaryClass: null,
        classification: "commercial",
        operator: "North Sea Lines",
        owner: null,
        buildYear: "2012",
        dimensions: "180 x 30 m",
        confidence: "high"
      },
      summary: "Commercial vessel identity is consistent with live AIS.",
      facts: ["Fact one."],
      sources: [{ title: "Registry", url: "https://example.test/vessel" }],
      limitations: ["Open web sources can be stale."]
    });
    const response = {
      output: [
        {
          results: [
            {
              title: "Registry duplicate",
              url: "https://example.test/vessel",
              image_url: "https://images.test/vessel.jpg",
              thumbnail_url: "https://images.test/thumb.jpg",
              source_website_url: "https://example.test/vessel",
              caption: "Northern Light underway"
            },
            {
              name: "Photo source",
              source_url: "https://photos.test/northern-light",
              imageUrl: "https://images.test/vessel.jpg"
            },
            {
              caption: "Second photo",
              url: "https://photos.test/second",
              imageUrl: "https://images.test/second.jpg"
            }
          ]
        },
        {
          content: [
            {
              annotations: [
                { title: "Annotation", url: "https://annotation.test/source" },
                { text: "Fallback annotation title", url: "https://annotation.test/fallback" }
              ]
            }
          ]
        }
      ]
    };

    const normalised = normaliseVesselModelIntel(modelValue, response);
    const images = extractVesselImages(response);

    expect(normalised.profile).toMatchObject({
      matchedName: "Northern Light",
      mmsi: "232001234",
      classification: "commercial",
      confidence: "high"
    });
    expect(normalised.sources.map((source) => source.url)).toEqual([
      "https://example.test/vessel",
      "https://photos.test/northern-light",
      "https://photos.test/second",
      "https://annotation.test/source",
      "https://annotation.test/fallback"
    ]);
    expect(images).toEqual([
      {
        imageUrl: "https://images.test/vessel.jpg",
        thumbnailUrl: "https://images.test/thumb.jpg",
        sourceUrl: "https://example.test/vessel",
        caption: "Northern Light underway"
      },
      {
        imageUrl: "https://images.test/second.jpg",
        sourceUrl: "https://photos.test/second",
        caption: "Second photo"
      }
    ]);
  });

  it("uses safe fallbacks for malformed vessel web search data", () => {
    const modelValue = {
      profile: {
        matchedName: null,
        imo: null,
        mmsi: "x",
        callSign: null,
        flag: null,
        vesselType: null,
        militaryClass: null,
        classification: "commercial",
        operator: null,
        owner: null,
        buildYear: null,
        dimensions: null,
        confidence: "high"
      },
      summary: "Model summary.",
      facts: ["Fact one."],
      sources: [
        { title: "Invalid", url: "not-a-url" },
        { title: "Valid", url: "https://valid.example/source" }
      ],
      limitations: ["Limit one."]
    } as Parameters<typeof normaliseVesselModelIntel>[0];
    const response = {
      output: [
        "not an item",
        {
          results: [
            "not a result",
            { url: "https://host-fallback.example/path" },
            { source_website_url: "notaurl", caption: "Invalid URL caption" },
            { image_url: "notaurl" },
            ...Array.from({ length: 5 }, (_, index) => ({
              image_url: `https://images.example/vessel-${index}.jpg`,
              url: `https://images.example/source-${index}`
            }))
          ]
        },
        {
          content: [
            "not content",
            { annotations: "not annotations" },
            {
              annotations: [
                "not annotation",
                { url: "https://annotation-host.example/path" },
                { title: "Bad annotation", url: "notaurl" }
              ]
            }
          ]
        }
      ]
    };

    const normalised = normaliseVesselModelIntel(modelValue, response);
    const images = extractVesselImages(response);

    expect(normalised.profile).toBeUndefined();
    expect(normalised.sources).toEqual([
      { title: "Valid", url: "https://valid.example/source" },
      { title: "host-fallback.example", url: "https://host-fallback.example/path" },
      { title: "images.example", url: "https://images.example/source-0" },
      { title: "images.example", url: "https://images.example/source-1" },
      { title: "images.example", url: "https://images.example/source-2" },
      { title: "images.example", url: "https://images.example/source-3" },
      { title: "images.example", url: "https://images.example/source-4" },
      { title: "annotation-host.example", url: "https://annotation-host.example/path" }
    ]);
    expect(images).toHaveLength(4);
    expect(images.every((image) => image.imageUrl.startsWith("https://images.example/"))).toBe(true);
  });

  it("builds AIS fallback facts and sanitises errors", () => {
    expect(buildVesselLocalFacts(vessel)).toEqual([
      "MMSI 232001234.",
      "AIS ship type is Cargo.",
      "Last reported position is 51.9500, 1.3000.",
      "Speed is 13.2 kn on course 76 degrees.",
      "Call sign NTHLT.",
      "AIS destination is Rotterdam."
    ]);
    expect(safeVesselErrorMessage("plain failure")).toBe("Unknown OpenAI API error.");
    expect(safeVesselErrorMessage(new Error("x".repeat(260)))).toHaveLength(240);
    expect(buildVesselLocalFacts({ ...vessel, callSign: undefined, destination: undefined })).toEqual([
      "MMSI 232001234.",
      "AIS ship type is Cargo.",
      "Last reported position is 51.9500, 1.3000.",
      "Speed is 13.2 kn on course 76 degrees."
    ]);
  });
});

describe("aircraft intel response helpers", () => {
  it("extracts structured output from every supported OpenAI response shape", () => {
    const parsed = { summary: "parsed" };

    expect(extractAircraftStructuredOutput({ output_parsed: parsed })).toBe(parsed);
    expect(extractAircraftStructuredOutput({ output_text: "{\"summary\":\"text\"}" })).toEqual({
      summary: "text"
    });
    expect(
      extractAircraftStructuredOutput({
        output: [{ content: [{ text: "{\"summary\":\"content\"}" }] }]
      })
    ).toEqual({ summary: "content" });
    expect(() => extractAircraftStructuredOutput({ output: [{ content: [{}] }] })).toThrow(
      "structured aircraft intel"
    );
  });

  it("deduplicates search images, sources, and compact profile fields", () => {
    const modelValue = modelAircraftIntelSchema.parse({
      profile: {
        matchedCallsign: "RFR123",
        icao24: "abc123",
        registration: "ZZ123",
        aircraftType: "A400M",
        classification: "military",
        operator: "Royal Air Force",
        owner: null,
        manufacturer: "Airbus",
        model: "A400M",
        serialNumber: null,
        buildYear: "2018",
        confidence: "high"
      },
      summary: "Military aircraft identity is consistent with live ADS-B.",
      facts: ["Fact one."],
      sources: [{ title: "Registry", url: "https://example.test/aircraft" }],
      limitations: ["Open web sources can be stale."]
    });
    const response = {
      output: [
        {
          results: [
            {
              title: "Registry duplicate",
              url: "https://example.test/aircraft",
              image_url: "https://images.test/aircraft.jpg",
              thumbnail_url: "https://images.test/aircraft-thumb.jpg",
              source_website_url: "https://example.test/aircraft",
              caption: "A400M in flight"
            },
            {
              name: "Photo source",
              source_url: "https://photos.test/a400m",
              imageUrl: "https://images.test/a400m-alt.jpg",
              sourceUrl: "https://photos.test/a400m"
            }
          ]
        },
        {
          content: [
            {
              annotations: [{ text: "News annotation", url: "https://news.test/a400m" }]
            }
          ]
        }
      ]
    };

    const normalised = normaliseAircraftModelIntel(modelValue, response);
    const images = extractAircraftImages(response);

    expect(normalised.profile).toMatchObject({
      matchedCallsign: "RFR123",
      icao24: "abc123",
      classification: "military",
      confidence: "high"
    });
    expect(normalised.sources.map((source) => source.url)).toEqual([
      "https://example.test/aircraft",
      "https://photos.test/a400m",
      "https://news.test/a400m"
    ]);
    expect(images).toEqual([
      {
        imageUrl: "https://images.test/aircraft.jpg",
        thumbnailUrl: "https://images.test/aircraft-thumb.jpg",
        sourceUrl: "https://example.test/aircraft",
        caption: "A400M in flight"
      },
      {
        imageUrl: "https://images.test/a400m-alt.jpg",
        thumbnailUrl: undefined,
        sourceUrl: "https://photos.test/a400m",
        caption: undefined
      }
    ]);
  });

  it("uses safe fallbacks for malformed aircraft web search data", () => {
    const modelValue = {
      profile: {
        matchedCallsign: null,
        icao24: "bad",
        registration: null,
        aircraftType: null,
        classification: "military",
        operator: null,
        owner: null,
        manufacturer: null,
        model: null,
        serialNumber: null,
        buildYear: null,
        confidence: "medium"
      },
      summary: "Aircraft model summary.",
      facts: ["Aircraft fact."],
      sources: [
        { title: "Invalid", url: "not-a-url" },
        { title: "Valid", url: "https://valid.example/aircraft" }
      ],
      limitations: ["Limit one."]
    } as Parameters<typeof normaliseAircraftModelIntel>[0];
    const response = {
      output: [
        "not an item",
        {
          results: [
            "not a result",
            { url: "https://air-host.example/path" },
            { source_website_url: "notaurl", caption: "Invalid URL caption" },
            { image_url: "notaurl" },
            ...Array.from({ length: 5 }, (_, index) => ({
              imageUrl: `https://images.example/aircraft-${index}.jpg`,
              sourceUrl: `https://images.example/air-source-${index}`
            }))
          ]
        },
        {
          content: [
            "not content",
            { annotations: "not annotations" },
            {
              annotations: [
                "not annotation",
                { url: "https://air-annotation.example/path" },
                { title: "Bad annotation", url: "notaurl" }
              ]
            }
          ]
        }
      ]
    };

    const normalised = normaliseAircraftModelIntel(modelValue, response);
    const images = extractAircraftImages(response);

    expect(normalised.profile).toBeUndefined();
    expect(normalised.sources).toEqual([
      { title: "Valid", url: "https://valid.example/aircraft" },
      { title: "air-host.example", url: "https://air-host.example/path" },
      { title: "air-annotation.example", url: "https://air-annotation.example/path" }
    ]);
    expect(images).toHaveLength(4);
    expect(images.every((image) => image.imageUrl.startsWith("https://images.example/"))).toBe(true);
  });

  it("builds ADS-B fallback facts and sanitises errors", () => {
    expect(buildAircraftLocalFacts(aircraft)).toEqual([
      "ICAO hex ABC123.",
      "Last reported position is 50.8000, -1.1000.",
      "Classification is military.",
      "Callsign RFR123.",
      "Registration ZZ123.",
      "Aircraft type A400M.",
      "Operator Royal Air Force.",
      "Altitude 22,000 ft."
    ]);
    expect(safeAircraftErrorMessage("plain failure")).toBe("Unknown OpenAI API error.");
    expect(safeAircraftErrorMessage(new Error("x".repeat(260)))).toHaveLength(240);
    expect(
      buildAircraftLocalFacts({
        ...aircraft,
        callsign: undefined,
        registration: undefined,
        aircraftType: undefined,
        operator: undefined,
        altitudeFt: undefined,
        groundSpeedKt: undefined,
        squawk: undefined
      })
    ).toEqual([
      "ICAO hex ABC123.",
      "Last reported position is 50.8000, -1.1000.",
      "Classification is military."
    ]);
  });
});

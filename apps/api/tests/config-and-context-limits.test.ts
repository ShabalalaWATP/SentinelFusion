import { describe, expect, it } from "vitest";
import {
  airportContextAreaLimitError,
  bearingDegrees,
  centreOfBounds,
  distanceKm,
  isPointInsideBounds
} from "../src/context/airport-context-limits";
import {
  parseBoundingBoxes,
  parseCsv,
  parseTrustProxy,
  unique
} from "../src/config/environment-parsers";

describe("environment parser helpers", () => {
  it("parses comma-separated values and removes duplicates without keeping blanks", () => {
    expect(parseCsv(undefined)).toEqual([]);
    expect(parseCsv(" alpha, beta ,, alpha ")).toEqual(["alpha", "beta", "alpha"]);
    expect(unique(["alpha", "beta", "alpha"])).toEqual(["alpha", "beta"]);
  });

  it("rejects unsafe trust-proxy true values and parses safe alternatives", () => {
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy(" off ")).toBe(false);
    expect(parseTrustProxy(" , ")).toBe(false);
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("127.0.0.1")).toBe("127.0.0.1");
    expect(parseTrustProxy("10.0.0.0/8, 127.0.0.1")).toEqual(["10.0.0.0/8", "127.0.0.1"]);
    expect(() => parseTrustProxy("true")).toThrow("TRUST_PROXY=true is unsafe");
  });

  it("validates AIS-style bounding-box JSON", () => {
    expect(parseBoundingBoxes("[[[50,-2],[51,-1]]]")).toEqual([[[50, -2], [51, -1]]]);
    expect(() => parseBoundingBoxes("[]")).toThrow();
    expect(() => parseBoundingBoxes("[[[95,-2],[51,-1]]]")).toThrow();
  });
});

describe("airport context geospatial limits", () => {
  it("reports tall, wide, large, and valid airport areas", () => {
    expect(
      airportContextAreaLimitError({ south: 0, west: 0, north: 46, east: 1 })
    ).toContain("too tall");
    expect(
      airportContextAreaLimitError({ south: 0, west: -50, north: 1, east: 50 })
    ).toContain("too wide");
    expect(
      airportContextAreaLimitError({ south: 0, west: -40, north: 40, east: 30 })
    ).toContain("too large");
    expect(
      airportContextAreaLimitError({ south: 50, west: 170, north: 51, east: -170 })
    ).toBeNull();
  });

  it("calculates antimeridian centres, inclusion, distance, and bearing", () => {
    const bounds = { south: -5, west: 179, north: 5, east: -178 };

    expect(centreOfBounds(bounds)).toEqual({ latitude: 0, longitude: -179.5 });
    expect(centreOfBounds({ south: -1, west: -10, north: 1, east: -800 })).toEqual({
      latitude: 0,
      longitude: 135
    });
    expect(isPointInsideBounds({ latitude: 0, longitude: 179.5 }, bounds)).toBe(true);
    expect(isPointInsideBounds({ latitude: 0, longitude: -179 }, bounds)).toBe(true);
    expect(isPointInsideBounds({ latitude: 0, longitude: 0 }, bounds)).toBe(false);
    expect(Math.round(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }))).toBe(111);
    expect(Math.round(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }))).toBe(45);
  });
});

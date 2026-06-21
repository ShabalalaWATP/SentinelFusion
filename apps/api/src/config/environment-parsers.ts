import { z } from "zod";

export type TrustProxyConfig = false | string | string[] | number;
export type AisBoundingBox = [[number, number], [number, number]];

export function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function parseTrustProxy(value: string): TrustProxyConfig {
  const trimmed = value.trim();
  const normalised = trimmed.toLowerCase();

  if (["", "0", "false", "no", "off"].includes(normalised)) {
    return false;
  }

  if (["true", "yes", "on"].includes(normalised)) {
    throw new Error(
      "TRUST_PROXY=true is unsafe because it trusts spoofable forwarded headers. Use false, a hop count such as 1, or trusted proxy addresses/CIDRs."
    );
  }

  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    if (hops > 0) {
      return hops;
    }
  }

  const entries = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return false;
  }

  return entries.length === 1 ? entries[0]! : entries;
}

export function parseBoundingBoxes(value: string): AisBoundingBox[] {
  return z
    .array(
      z.tuple([
        z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
        z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
      ])
    )
    .min(1)
    .parse(JSON.parse(value));
}

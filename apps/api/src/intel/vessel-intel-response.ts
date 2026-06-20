import { z } from "zod";
import type {
  Vessel,
  VesselIntelImage,
  VesselIntelProfile,
  VesselIntelSource
} from "@aisstream/shared";
import {
  vesselIntelImageSchema,
  vesselIntelProfileSchema,
  vesselIntelSourceSchema
} from "@aisstream/shared";

export type ParsedResponse<T> = {
  id?: string;
  output_parsed?: T | null;
  output_text?: string;
  output?: unknown[];
  _request_id?: string;
};

export const modelVesselIntelSchema = z.object({
  profile: z.object({
    matchedName: z.string().min(1).max(160).nullable(),
    imo: z.string().min(3).max(20).nullable(),
    mmsi: z.string().min(3).max(20).nullable(),
    callSign: z.string().min(1).max(32).nullable(),
    flag: z.string().min(1).max(80).nullable(),
    vesselType: z.string().min(1).max(120).nullable(),
    militaryClass: z.string().min(1).max(160).nullable(),
    classification: z.enum(["military", "government", "commercial", "private", "unknown"]),
    operator: z.string().min(1).max(160).nullable(),
    owner: z.string().min(1).max(160).nullable(),
    buildYear: z.string().min(2).max(20).nullable(),
    dimensions: z.string().min(1).max(120).nullable(),
    confidence: z.enum(["high", "medium", "low"])
  }),
  summary: z.string().min(1).max(1200),
  facts: z.array(z.string().min(1).max(240)).min(1).max(8),
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        url: z.string().min(1).max(500)
      })
    )
    .max(8),
  limitations: z.array(z.string().min(1).max(240)).min(1).max(6)
});

export type NormalisedModelIntel = {
  profile?: VesselIntelProfile;
  summary: string;
  facts: string[];
  sources: VesselIntelSource[];
  limitations: string[];
};

export function extractStructuredOutput(response: ParsedResponse<unknown>): unknown {
  if (response.output_parsed) {
    return response.output_parsed;
  }

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return JSON.parse(response.output_text);
  }

  for (const item of response.output ?? []) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!isRecord(content)) {
        continue;
      }

      const text = readString(content.text);
      if (text) {
        return JSON.parse(text);
      }
    }
  }

  throw new Error("OpenAI response did not include structured vessel intel.");
}

export function extractImages(response: ParsedResponse<unknown>): VesselIntelImage[] {
  const images: VesselIntelImage[] = [];

  for (const item of response.output ?? []) {
    if (!isRecord(item) || !Array.isArray(item.results)) {
      continue;
    }

    for (const result of item.results) {
      if (!isRecord(result)) {
        continue;
      }

      const imageUrl = readString(result.image_url) ?? readString(result.imageUrl);
      if (!imageUrl) {
        continue;
      }

      const parsed = vesselIntelImageSchema.safeParse({
        imageUrl,
        thumbnailUrl: readString(result.thumbnail_url) ?? readString(result.thumbnailUrl),
        sourceUrl:
          readString(result.source_website_url) ??
          readString(result.sourceUrl) ??
          readString(result.url),
        caption: readString(result.caption)
      });

      if (parsed.success && !images.some((image) => image.imageUrl === parsed.data.imageUrl)) {
        images.push(parsed.data);
      }
    }
  }

  return images.slice(0, 4);
}

export function normaliseModelIntel(
  value: z.infer<typeof modelVesselIntelSchema>,
  response: ParsedResponse<unknown>
): NormalisedModelIntel {
  const profile = vesselIntelProfileSchema.safeParse(compactProfile(value.profile));

  return {
    ...(profile.success ? { profile: profile.data } : {}),
    summary: value.summary,
    facts: value.facts,
    sources: uniqueSources([
      ...normaliseSources(value.sources),
      ...extractSearchSources(response)
    ]).slice(0, 8),
    limitations: value.limitations
  };
}

function compactProfile(profile: z.infer<typeof modelVesselIntelSchema>["profile"]): unknown {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== null && value !== undefined)
  );
}

export function buildLocalFacts(vessel: Vessel): string[] {
  const facts = [
    `MMSI ${vessel.mmsi}.`,
    `AIS ship type is ${vessel.shipType}.`,
    `Last reported position is ${vessel.latitude.toFixed(4)}, ${vessel.longitude.toFixed(4)}.`,
    `Speed is ${vessel.speedOverGround.toFixed(1)} kn on course ${Math.round(
      vessel.courseOverGround
    )} degrees.`
  ];

  if (vessel.callSign) {
    facts.push(`Call sign ${vessel.callSign}.`);
  }

  if (vessel.destination) {
    facts.push(`AIS destination is ${vessel.destination}.`);
  }

  return facts.slice(0, 8);
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown OpenAI API error.";
  return message.length > 240 ? message.slice(0, 240) : message;
}

function normaliseSources(sources: Array<{ title: string; url: string }>): VesselIntelSource[] {
  return sources
    .map((source) => vesselIntelSourceSchema.safeParse(source))
    .filter((source) => source.success)
    .map((source) => source.data);
}

function extractSearchSources(response: ParsedResponse<unknown>): VesselIntelSource[] {
  const sources: VesselIntelSource[] = [];

  for (const item of response.output ?? []) {
    if (!isRecord(item)) {
      continue;
    }

    if (Array.isArray(item.results)) {
      sources.push(...extractSourcesFromResults(item.results));
    }

    if (Array.isArray(item.content)) {
      sources.push(...extractSourcesFromContent(item.content));
    }
  }

  return sources;
}

function extractSourcesFromResults(results: unknown[]): VesselIntelSource[] {
  return results.flatMap((result) => {
    if (!isRecord(result)) {
      return [];
    }

    const url =
      readString(result.url) ??
      readString(result.source_url) ??
      readString(result.source_website_url);

    if (!url) {
      return [];
    }

    const title =
      readString(result.title) ??
      readString(result.name) ??
      readString(result.caption) ??
      hostnameFromUrl(url) ??
      "Source";
    const parsed = vesselIntelSourceSchema.safeParse({
      title: title.slice(0, 160),
      url
    });

    return parsed.success ? [parsed.data] : [];
  });
}

function extractSourcesFromContent(contentItems: unknown[]): VesselIntelSource[] {
  return contentItems.flatMap((content) => {
    if (!isRecord(content) || !Array.isArray(content.annotations)) {
      return [];
    }

    return content.annotations.flatMap((annotation) => {
      if (!isRecord(annotation)) {
        return [];
      }

      const url = readString(annotation.url);
      if (!url) {
        return [];
      }

      const title =
        readString(annotation.title) ??
        readString(annotation.text) ??
        hostnameFromUrl(url) ??
        "Source";
      const parsed = vesselIntelSourceSchema.safeParse({
        title: title.slice(0, 160),
        url
      });

      return parsed.success ? [parsed.data] : [];
    });
  });
}

function uniqueSources(sources: VesselIntelSource[]): VesselIntelSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) {
      return false;
    }

    seen.add(source.url);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function hostnameFromUrl(value: string): string | undefined {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

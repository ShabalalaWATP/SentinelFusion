import { z } from "zod";
import type {
  Aircraft,
  AircraftIntelImage,
  AircraftIntelProfile,
  AircraftIntelSource
} from "@aisstream/shared";
import {
  aircraftIntelImageSchema,
  aircraftIntelProfileSchema,
  aircraftIntelSourceSchema,
  aircraftClassificationSchema
} from "@aisstream/shared";

export type ParsedResponse<T> = {
  id?: string;
  output_parsed?: T | null;
  output_text?: string;
  output?: unknown[];
  _request_id?: string;
};

export const modelAircraftIntelSchema = z.object({
  profile: z.object({
    matchedCallsign: z.string().min(1).max(40).nullable(),
    icao24: z.string().min(6).max(7).nullable(),
    registration: z.string().min(1).max(24).nullable(),
    aircraftType: z.string().min(1).max(120).nullable(),
    classification: aircraftClassificationSchema,
    operator: z.string().min(1).max(160).nullable(),
    owner: z.string().min(1).max(160).nullable(),
    manufacturer: z.string().min(1).max(120).nullable(),
    model: z.string().min(1).max(120).nullable(),
    serialNumber: z.string().min(1).max(80).nullable(),
    buildYear: z.string().min(2).max(20).nullable(),
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

export type NormalisedAircraftIntel = {
  profile?: AircraftIntelProfile;
  summary: string;
  facts: string[];
  sources: AircraftIntelSource[];
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

  throw new Error("OpenAI response did not include structured aircraft intel.");
}

export function extractImages(response: ParsedResponse<unknown>): AircraftIntelImage[] {
  const images: AircraftIntelImage[] = [];

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

      const parsed = aircraftIntelImageSchema.safeParse({
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
  value: z.infer<typeof modelAircraftIntelSchema>,
  response: ParsedResponse<unknown>
): NormalisedAircraftIntel {
  const profile = aircraftIntelProfileSchema.safeParse(compactProfile(value.profile));

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

export function buildLocalFacts(aircraft: Aircraft): string[] {
  const facts = [
    `ICAO hex ${aircraft.icao24.toUpperCase()}.`,
    `Last reported position is ${aircraft.latitude.toFixed(4)}, ${aircraft.longitude.toFixed(4)}.`,
    `Classification is ${aircraft.classification}.`
  ];

  if (aircraft.callsign) {
    facts.push(`Callsign ${aircraft.callsign}.`);
  }

  if (aircraft.registration) {
    facts.push(`Registration ${aircraft.registration}.`);
  }

  if (aircraft.aircraftType) {
    facts.push(`Aircraft type ${aircraft.aircraftType}.`);
  }

  if (aircraft.operator) {
    facts.push(`Operator ${aircraft.operator}.`);
  }

  if (aircraft.altitudeFt !== undefined) {
    facts.push(`Altitude ${Math.round(aircraft.altitudeFt).toLocaleString("en-GB")} ft.`);
  }

  if (aircraft.groundSpeedKt !== undefined) {
    facts.push(`Ground speed ${aircraft.groundSpeedKt.toFixed(0)} kt.`);
  }

  if (aircraft.squawk) {
    facts.push(`Squawk ${aircraft.squawk}.`);
  }

  return facts.slice(0, 8);
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown OpenAI API error.";
  return message.length > 240 ? message.slice(0, 240) : message;
}

function compactProfile(profile: z.infer<typeof modelAircraftIntelSchema>["profile"]): unknown {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== null && value !== undefined)
  );
}

function normaliseSources(sources: Array<{ title: string; url: string }>): AircraftIntelSource[] {
  return sources
    .map((source) => aircraftIntelSourceSchema.safeParse(source))
    .filter((source) => source.success)
    .map((source) => source.data);
}

function extractSearchSources(response: ParsedResponse<unknown>): AircraftIntelSource[] {
  const sources: AircraftIntelSource[] = [];

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

function extractSourcesFromResults(results: unknown[]): AircraftIntelSource[] {
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
    const parsed = aircraftIntelSourceSchema.safeParse({
      title: title.slice(0, 160),
      url
    });

    return parsed.success ? [parsed.data] : [];
  });
}

function extractSourcesFromContent(contentItems: unknown[]): AircraftIntelSource[] {
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
      const parsed = aircraftIntelSourceSchema.safeParse({
        title: title.slice(0, 160),
        url
      });

      return parsed.success ? [parsed.data] : [];
    });
  });
}

function uniqueSources(sources: AircraftIntelSource[]): AircraftIntelSource[] {
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

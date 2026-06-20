import type { Vessel } from "@aisstream/shared";
import type {
  AnalysisAreaFocus,
  AnalysisLandmark,
  AnalysisLandmarkContext
} from "../domain/interfaces";

type LandmarkDefinition = Omit<AnalysisLandmark, "distanceNm" | "bearingDegrees">;

const landmarkRegistry: LandmarkDefinition[] = [
  landmark("portsmouth-naval-base", "Portsmouth Naval Base", "naval_base", ["portsmouth naval base", "hmnb portsmouth"], 50.812, -1.11),
  landmark("spithead", "Spithead", "landmark", ["spithead"], 50.75, -1.1),
  landmark("dover-strait", "Strait of Dover", "strait", ["dover strait", "strait of dover"], 51.05, 1.45),
  landmark("gibraltar-strait", "Strait of Gibraltar", "strait", ["gibraltar", "strait of gibraltar"], 36.05, -5.55),
  landmark("suez-canal", "Suez Canal", "canal", ["suez", "suez canal"], 30.55, 32.35),
  landmark("panama-canal", "Panama Canal", "canal", ["panama canal"], 9.08, -79.68),
  landmark("singapore-strait", "Singapore Strait", "strait", ["singapore strait", "singapore"], 1.22, 103.8),
  landmark("hormuz", "Strait of Hormuz", "strait", ["hormuz", "strait of hormuz"], 26.57, 56.25),
  landmark("bab-el-mandeb", "Bab el-Mandeb", "strait", ["bab el mandeb", "bab-el-mandeb"], 12.58, 43.33),
  landmark("bosporus", "Bosporus Strait", "strait", ["bosporus", "bosphorus"], 41.12, 29.05),
  landmark("rotterdam", "Port of Rotterdam", "port", ["rotterdam", "port of rotterdam"], 51.95, 4.12),
  landmark("antwerp", "Port of Antwerp", "port", ["antwerp", "port of antwerp"], 51.27, 4.32),
  landmark("felixstowe", "Port of Felixstowe", "port", ["felixstowe", "port of felixstowe"], 51.95, 1.31),
  landmark("southampton", "Port of Southampton", "port", ["southampton", "southampton water"], 50.9, -1.4),
  landmark("norfolk-naval-station", "Naval Station Norfolk", "naval_base", ["naval station norfolk", "norfolk naval base"], 36.95, -76.33),
  landmark("san-diego-naval-base", "Naval Base San Diego", "naval_base", ["naval base san diego", "san diego naval base"], 32.68, -117.12),
  landmark("yokosuka", "Yokosuka Naval Base", "naval_base", ["yokosuka", "yokosuka naval base"], 35.29, 139.66),
  landmark("pearl-harbor", "Pearl Harbor", "naval_base", ["pearl harbor", "pearl harbour"], 21.36, -157.95),
  landmark("helsinki", "Port of Helsinki", "port", ["helsinki", "port of helsinki"], 60.16, 24.96),
  landmark("dover-port", "Port of Dover", "port", ["port of dover", "dover"], 51.12, 1.33),
  landmark("heathrow", "Heathrow Airport", "airport", ["heathrow", "london heathrow"], 51.47, -0.45),
  landmark("jfk", "John F. Kennedy International Airport", "airport", ["jfk", "kennedy airport"], 40.64, -73.78)
];

export function resolveLandmarkContext(
  question: string,
  vessels: Vessel[],
  selectedVessel?: Vessel,
  areaFocus?: AnalysisAreaFocus
): AnalysisLandmarkContext | undefined {
  const questionMatch = matchQuestion(question);
  const referencePoint = selectedVessel
    ? {
        reference: "selected_vessel" as const,
        latitude: selectedVessel.latitude,
        longitude: selectedVessel.longitude
      }
    : areaFocus
      ? {
          reference: "area" as const,
          latitude: (areaFocus.bounds.south + areaFocus.bounds.north) / 2,
          longitude: (areaFocus.bounds.west + areaFocus.bounds.east) / 2
        }
      : questionMatch
        ? {
            reference: "question" as const,
            latitude: questionMatch.latitude,
            longitude: questionMatch.longitude
          }
        : deriveFleetReference(vessels);

  if (!referencePoint && !questionMatch) {
    return undefined;
  }

  const landmarks = nearestLandmarks(referencePoint ?? questionMatch, questionMatch).slice(0, 8);

  return {
    ...(questionMatch ? { matchedText: questionMatch.name } : {}),
    reference: referencePoint?.reference ?? "question",
    landmarks
  };
}

function nearestLandmarks(
  reference: Pick<LandmarkDefinition, "latitude" | "longitude"> | undefined,
  questionMatch: LandmarkDefinition | undefined
): AnalysisLandmark[] {
  if (!reference) {
    return questionMatch ? [questionMatch] : [];
  }

  return landmarkRegistry
    .map((item) => ({
      ...item,
      distanceNm: Number(distanceNm(reference, item).toFixed(1)),
      bearingDegrees: Math.round(bearingDegrees(reference, item))
    }))
    .sort((left, right) => {
      if (questionMatch && left.id === questionMatch.id) {
        return -1;
      }

      if (questionMatch && right.id === questionMatch.id) {
        return 1;
      }

      return (left.distanceNm ?? 0) - (right.distanceNm ?? 0);
    });
}

function matchQuestion(question: string): LandmarkDefinition | undefined {
  const normalised = normaliseText(question);

  return landmarkRegistry
    .flatMap((item) =>
      item.aliases.map((alias) => ({
        item,
        alias,
        index: normalised.indexOf(normaliseText(alias))
      }))
    )
    .filter((match) => match.index >= 0)
    .sort((left, right) => right.alias.length - left.alias.length)[0]?.item;
}

function deriveFleetReference(vessels: Vessel[]):
  | {
      reference: "fleet";
      latitude: number;
      longitude: number;
    }
  | undefined {
  if (vessels.length === 0) {
    return undefined;
  }

  const sample = vessels.slice(0, 100);
  return {
    reference: "fleet",
    latitude: sample.reduce((total, vessel) => total + vessel.latitude, 0) / sample.length,
    longitude: sample.reduce((total, vessel) => total + vessel.longitude, 0) / sample.length
  };
}

function landmark(
  id: string,
  name: string,
  category: LandmarkDefinition["category"],
  aliases: string[],
  latitude: number,
  longitude: number
): LandmarkDefinition {
  return {
    id,
    name,
    category,
    aliases,
    latitude,
    longitude
  };
}

function distanceNm(
  from: Pick<LandmarkDefinition, "latitude" | "longitude">,
  to: Pick<LandmarkDefinition, "latitude" | "longitude">
): number {
  const earthRadiusNm = 3440.065;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(
  from: Pick<LandmarkDefinition, "latitude" | "longitude">,
  to: Pick<LandmarkDefinition, "latitude" | "longitude">
): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function normaliseText(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

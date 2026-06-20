export type TrafficAreaBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type TrafficAreaDefinition = {
  id: string;
  name: string;
  category: "airport" | "canal" | "channel" | "chokepoint" | "port" | "region" | "strait";
  aliases: string[];
  bounds: TrafficAreaBounds;
};

export type TrafficAreaMatch = {
  area: TrafficAreaDefinition;
  matchedAlias: string;
};

export const trafficAreaRegistry: TrafficAreaDefinition[] = [
  area("portsmouth", "Portsmouth", "port", ["portsmouth", "portsmouth harbour", "spithead"], 50.68, -1.28, 50.9, -0.86),
  area("solent", "Solent", "channel", ["solent", "isle of wight"], 50.55, -1.72, 51.02, -0.78),
  area("southampton", "Southampton", "port", ["southampton", "southampton water"], 50.78, -1.55, 51.02, -1.18),
  area("dover", "Dover and Strait of Dover", "strait", ["dover", "strait of dover", "dover strait"], 50.92, 0.75, 51.32, 1.62),
  area("english-channel", "English Channel", "channel", ["english channel", "channel"], 49.0, -6.2, 51.8, 2.4),
  area("thames-estuary", "Thames Estuary", "region", ["thames estuary", "london gateway", "river thames"], 51.25, -0.15, 51.75, 1.45),
  area("felixstowe", "Felixstowe and Harwich", "port", ["felixstowe", "harwich", "port of felixstowe"], 51.82, 0.92, 52.12, 1.45),
  area("liverpool", "Liverpool and Mersey", "port", ["liverpool", "mersey"], 53.25, -3.25, 53.62, -2.68),
  area("bristol-channel", "Bristol Channel", "channel", ["bristol channel", "cardiff", "newport"], 51.25, -4.1, 51.8, -2.65),
  area("rotterdam", "Port of Rotterdam", "port", ["rotterdam", "maasvlakte", "port of rotterdam"], 51.75, 3.65, 52.1, 4.55),
  area("antwerp", "Port of Antwerp", "port", ["antwerp", "scheldt", "port of antwerp"], 51.1, 3.85, 51.45, 4.55),
  area("hamburg", "Hamburg", "port", ["hamburg", "elbe"], 53.35, 9.55, 53.75, 10.25),
  area("singapore", "Singapore Strait", "strait", ["singapore", "singapore strait"], 1.05, 103.45, 1.55, 104.25),
  area("hong-kong", "Hong Kong", "port", ["hong kong", "hong kong harbour", "hong kong harbor"], 22.1, 113.75, 22.55, 114.45),
  area("busan", "Busan", "port", ["busan", "pusan"], 34.95, 128.78, 35.35, 129.35),
  area("shanghai", "Shanghai and Yangtze Estuary", "port", ["shanghai", "yangtze estuary"], 30.75, 121.1, 31.75, 122.25),
  area("tokyo-bay", "Tokyo Bay", "port", ["tokyo bay", "tokyo", "yokohama"], 35.15, 139.45, 35.85, 140.15),
  area("sydney", "Sydney", "port", ["sydney", "port botany"], -34.12, 150.95, -33.65, 151.45),
  area("melbourne", "Melbourne and Port Phillip", "port", ["melbourne", "port phillip"], -38.45, 144.45, -37.65, 145.25),
  area("new-york", "New York Harbor", "port", ["new york", "new york harbour", "new york harbor"], 40.35, -74.35, 40.95, -73.55),
  area("los-angeles", "Los Angeles and Long Beach", "port", ["los angeles", "long beach"], 33.55, -118.45, 34.05, -117.95),
  area("san-francisco", "San Francisco Bay", "port", ["san francisco", "san francisco bay"], 37.35, -122.65, 38.25, -121.8),
  area("seattle", "Seattle and Puget Sound", "port", ["seattle", "puget sound"], 47.35, -122.65, 48.05, -122.05),
  area("miami", "Miami", "port", ["miami", "portmiami"], 25.55, -80.35, 25.95, -79.95),
  area("norfolk", "Norfolk and Hampton Roads", "port", ["norfolk", "hampton roads", "naval station norfolk"], 36.75, -76.55, 37.15, -75.9),
  area("gibraltar", "Strait of Gibraltar", "strait", ["gibraltar", "strait of gibraltar"], 35.85, -5.95, 36.25, -5.15),
  area("suez", "Suez Canal", "canal", ["suez", "suez canal"], 29.75, 32.1, 31.35, 32.65),
  area("panama", "Panama Canal", "canal", ["panama canal", "panama"], 8.75, -80.15, 9.45, -79.35),
  area("hormuz", "Strait of Hormuz", "chokepoint", ["hormuz", "strait of hormuz", "hormuz strait"], 25.35, 55.05, 27.25, 57.35),
  area("bab-el-mandeb", "Bab el-Mandeb", "chokepoint", ["bab el mandeb", "bab-el-mandeb", "mandeb"], 12.0, 42.75, 13.25, 44.0),
  area("taiwan-strait", "Taiwan Strait", "strait", ["taiwan strait", "taiwan"], 22.0, 118.0, 26.3, 121.4),
  area("south-china-sea", "South China Sea", "region", ["south china sea", "spratly", "paracel"], 2.0, 105.0, 23.5, 122.5),
  area("persian-gulf", "Persian Gulf", "region", ["persian gulf", "arabian gulf"], 24.0, 48.0, 30.7, 57.3),
  area("heathrow", "Heathrow", "airport", ["heathrow", "london heathrow"], 51.36, -0.62, 51.56, -0.25),
  area("jfk", "John F. Kennedy International Airport", "airport", ["jfk", "kennedy airport", "john f kennedy"], 40.5, -74.0, 40.78, -73.6)
];

export function findTrafficAreaById(id: string): TrafficAreaDefinition | undefined {
  return trafficAreaRegistry.find((areaDefinition) => areaDefinition.id === id);
}

export function resolveTrafficAreaByText(text: string): TrafficAreaMatch | undefined {
  const normalised = normaliseTrafficText(text);

  return trafficAreaRegistry
    .flatMap((definition) =>
      definition.aliases.map((alias) => ({
        area: definition,
        matchedAlias: alias,
        index: normalised.indexOf(normaliseTrafficText(alias))
      }))
    )
    .filter((candidate) => candidate.index >= 0)
    .sort((left, right) => {
      const aliasDifference = right.matchedAlias.length - left.matchedAlias.length;
      return aliasDifference !== 0 ? aliasDifference : left.index - right.index;
    })[0];
}

export function isCoordinateInsideBounds(
  target: { latitude: number; longitude: number },
  bounds: TrafficAreaBounds
): boolean {
  const latitudeInRange = target.latitude >= bounds.south && target.latitude <= bounds.north;
  const longitudeInRange =
    bounds.west <= bounds.east
      ? target.longitude >= bounds.west && target.longitude <= bounds.east
      : target.longitude >= bounds.west || target.longitude <= bounds.east;

  return latitudeInRange && longitudeInRange;
}

export function normaliseTrafficText(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function area(
  id: string,
  name: string,
  category: TrafficAreaDefinition["category"],
  aliases: string[],
  south: number,
  west: number,
  north: number,
  east: number
): TrafficAreaDefinition {
  return {
    id,
    name,
    category,
    aliases,
    bounds: { south, west, north, east }
  };
}

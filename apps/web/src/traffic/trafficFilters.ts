import {
  isCoordinateInsideBounds,
  type Aircraft,
  type AircraftClassification,
  type TrafficAreaBounds,
  type Vessel
} from "@aisstream/shared";

export type TrafficDomain = "all" | "vessels" | "aircraft";
export type TrafficEntityDomain = "vessel" | "aircraft";
export type AircraftFilterSettings = {
  query: string;
  classifications: AircraftClassification[];
  emergencyOnly: boolean;
  airborneOnly: boolean;
  minAltitudeFt: number | null;
  maxAltitudeFt: number | null;
  minSpeedKt: number | null;
  maxSpeedKt: number | null;
};

export type AreaTrafficSummary = {
  vessels: Vessel[];
  aircraft: Aircraft[];
  vesselCount: number;
  aircraftCount: number;
  highRiskVessels: number;
  militaryAircraft: number;
  emergencyAircraft: number;
};

export type VisibleTrafficOptions = {
  activeAreaOnlyRule?: {
    area: { bounds: TrafficAreaBounds };
    domain: TrafficDomain;
  } | null;
  aircraftFilters: AircraftFilterSettings;
  areaOnlyBounds?: TrafficAreaBounds | null;
  domainFilter: TrafficDomain;
  selectedAircraftId?: string | null;
};

export type VisibleTraffic = {
  aircraft: Aircraft[];
  vessels: Vessel[];
};

export const defaultAircraftFilterSettings: AircraftFilterSettings = {
  query: "",
  classifications: [],
  emergencyOnly: false,
  airborneOnly: false,
  minAltitudeFt: null,
  maxAltitudeFt: null,
  minSpeedKt: null,
  maxSpeedKt: null
};

export function filterVesselsByArea(vessels: Vessel[], bounds: TrafficAreaBounds | null): Vessel[] {
  if (!bounds) {
    return vessels;
  }

  return vessels.filter((vessel) => isCoordinateInsideBounds(vessel, bounds));
}

export function filterAircraftByArea(aircraft: Aircraft[], bounds: TrafficAreaBounds | null): Aircraft[] {
  if (!bounds) {
    return aircraft;
  }

  return aircraft.filter((item) => isCoordinateInsideBounds(item, bounds));
}

export function filterAircraftBySettings(
  aircraft: Aircraft[],
  filters: AircraftFilterSettings
): Aircraft[] {
  const query = filters.query.trim().toLowerCase();

  return aircraft.filter((item) => {
    if (query && !aircraftMatchesQuery(item, query)) {
      return false;
    }

    if (
      filters.classifications.length > 0 &&
      !filters.classifications.includes(item.classification)
    ) {
      return false;
    }

    if (filters.emergencyOnly && !item.emergency) {
      return false;
    }

    if (filters.airborneOnly && item.onGround) {
      return false;
    }

    if (!isWithinRange(item.altitudeFt, filters.minAltitudeFt, filters.maxAltitudeFt)) {
      return false;
    }

    return isWithinRange(item.groundSpeedKt, filters.minSpeedKt, filters.maxSpeedKt);
  });
}

export function countActiveAircraftFilters(filters: AircraftFilterSettings): number {
  return [
    filters.query.trim().length > 0,
    filters.classifications.length > 0,
    filters.emergencyOnly,
    filters.airborneOnly,
    filters.minAltitudeFt !== null,
    filters.maxAltitudeFt !== null,
    filters.minSpeedKt !== null,
    filters.maxSpeedKt !== null
  ].filter(Boolean).length;
}

export function selectVisibleTraffic(
  vessels: Vessel[],
  aircraft: Aircraft[],
  options: VisibleTrafficOptions
): VisibleTraffic {
  const areaOnlyBounds =
    options.activeAreaOnlyRule?.area.bounds ?? options.areaOnlyBounds ?? null;
  const visibleVessels = shouldIncludeDomain("vessel", options)
    ? filterVesselsByArea(vessels, areaOnlyBounds)
    : [];
  const visibleAircraft = shouldIncludeDomain("aircraft", options)
    ? selectVisibleAircraft(aircraft, options, areaOnlyBounds)
    : [];

  return {
    aircraft: visibleAircraft,
    vessels: visibleVessels
  };
}

export function isDomainIncluded(
  entityDomain: TrafficEntityDomain,
  domain: TrafficDomain
): boolean {
  return domain === "all" || (domain === "vessels" && entityDomain === "vessel") || (domain === "aircraft" && entityDomain === "aircraft");
}

export function summariseAreaTraffic(
  vessels: Vessel[],
  aircraft: Aircraft[],
  bounds: TrafficAreaBounds | null
): AreaTrafficSummary {
  const areaVessels = filterVesselsByArea(vessels, bounds);
  const areaAircraft = filterAircraftByArea(aircraft, bounds);

  return {
    vessels: areaVessels,
    aircraft: areaAircraft,
    vesselCount: areaVessels.length,
    aircraftCount: areaAircraft.length,
    highRiskVessels: areaVessels.filter((vessel) => vessel.riskLevel === "high").length,
    militaryAircraft: areaAircraft.filter((item) => item.classification === "military").length,
    emergencyAircraft: areaAircraft.filter((item) => item.emergency).length
  };
}

export function matchingWatchedIds<T extends { id: string; latitude: number; longitude: number }>(
  entities: T[],
  bounds: TrafficAreaBounds[]
): Set<string> {
  if (bounds.length === 0) {
    return new Set();
  }

  return new Set(
    entities
      .filter((entity) => bounds.some((areaBounds) => isCoordinateInsideBounds(entity, areaBounds)))
      .map((entity) => entity.id)
  );
}

function aircraftMatchesQuery(aircraft: Aircraft, query: string): boolean {
  return [
    aircraft.callsign,
    aircraft.registration,
    aircraft.icao24,
    aircraft.operator,
    aircraft.aircraftType,
    aircraft.originCountry,
    aircraft.originAirport,
    aircraft.destinationAirport,
    aircraft.category,
    aircraft.classification,
    aircraft.squawk
  ].some((value) => value?.toLowerCase().includes(query));
}

function selectVisibleAircraft(
  aircraft: Aircraft[],
  options: VisibleTrafficOptions,
  areaOnlyBounds: TrafficAreaBounds | null
): Aircraft[] {
  const areaAircraft = filterAircraftByArea(aircraft, areaOnlyBounds);
  const filteredAircraft = filterAircraftBySettings(areaAircraft, options.aircraftFilters);
  const selectedAircraft = options.selectedAircraftId
    ? areaAircraft.find((item) => item.id === options.selectedAircraftId)
    : undefined;

  if (selectedAircraft && !filteredAircraft.some((item) => item.id === selectedAircraft.id)) {
    return [...filteredAircraft, selectedAircraft];
  }

  return filteredAircraft;
}

function shouldIncludeDomain(
  entityDomain: TrafficEntityDomain,
  options: VisibleTrafficOptions
): boolean {
  if (!isDomainIncluded(entityDomain, options.domainFilter)) {
    return false;
  }

  return options.activeAreaOnlyRule
    ? isDomainIncluded(entityDomain, options.activeAreaOnlyRule.domain)
    : true;
}

function isWithinRange(
  value: number | undefined,
  minValue: number | null,
  maxValue: number | null
): boolean {
  if (minValue === null && maxValue === null) {
    return true;
  }

  if (value === undefined) {
    return false;
  }

  if (minValue !== null && value < minValue) {
    return false;
  }

  return maxValue === null || value <= maxValue;
}

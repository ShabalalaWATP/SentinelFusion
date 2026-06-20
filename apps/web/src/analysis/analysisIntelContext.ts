import type {
  AircraftIntelResponse,
  AnalysisAircraftIntelContext,
  AnalysisVesselIntelContext,
  VesselIntelResponse
} from "@aisstream/shared";

export function toSelectedAnalysisIntel(
  result: VesselIntelResponse | undefined
): AnalysisVesselIntelContext[] | undefined {
  return result ? [toAnalysisIntelContext(result)] : undefined;
}

export function toFleetAnalysisIntel(
  results: Record<string, VesselIntelResponse>
): AnalysisVesselIntelContext[] | undefined {
  const values = Object.values(results).slice(0, 8).map(toAnalysisIntelContext);
  return values.length > 0 ? values : undefined;
}

export function toFleetAnalysisAircraftIntel(
  results: Record<string, AircraftIntelResponse>
): AnalysisAircraftIntelContext[] | undefined {
  const values = Object.values(results).slice(0, 8).map(toAnalysisAircraftIntelContext);
  return values.length > 0 ? values : undefined;
}

function toAnalysisIntelContext(result: VesselIntelResponse): AnalysisVesselIntelContext {
  return {
    vesselId: result.vesselId,
    status: result.status,
    ...(result.profile ? { profile: result.profile } : {}),
    summary: result.summary,
    facts: result.facts.slice(0, 8),
    sources: result.sources.slice(0, 8),
    limitations: result.limitations.slice(0, 6),
    generatedAt: result.generatedAt
  };
}

function toAnalysisAircraftIntelContext(
  result: AircraftIntelResponse
): AnalysisAircraftIntelContext {
  return {
    aircraftId: result.aircraftId,
    status: result.status,
    ...(result.profile ? { profile: result.profile } : {}),
    summary: result.summary,
    facts: result.facts.slice(0, 8),
    sources: result.sources.slice(0, 8),
    limitations: result.limitations.slice(0, 6),
    generatedAt: result.generatedAt
  };
}

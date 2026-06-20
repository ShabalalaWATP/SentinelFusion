import { analysisRequestSchema } from "@aisstream/shared";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/environment";
import { resolveAreaBoundsFocus, resolveAreaFocus } from "../analysis/area-analysis";
import { resolveLandmarkContext } from "../analysis/landmark-analysis";
import type {
  IAircraftAnalyticsService,
  IAircraftRepository,
  IAnalysisAgentService,
  IVesselAnalyticsService,
  IVesselRepository
} from "../domain/interfaces";
import { toAnalysisAreaResult } from "../analysis/area-result";
import { isAuthorised } from "./auth";

type AnalysisRouteDependencies = {
  aircraftAnalytics?: IAircraftAnalyticsService;
  aircraftRepository?: IAircraftRepository;
  analytics: IVesselAnalyticsService;
  config: AppConfig;
  repository: IVesselRepository;
  service: IAnalysisAgentService;
};

export async function registerAnalysisRoute(
  app: FastifyInstance,
  dependencies: AnalysisRouteDependencies
): Promise<void> {
  app.post("/analysis", async (request, reply) => {
    if (!isAuthorised(request, dependencies.config.analysisApiToken)) {
      return reply.code(401).send({ error: "Analysis token is required." });
    }

    const parsed = analysisRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Analysis request is invalid." });
    }

    const vessels = dependencies.repository.getAll();
    const aircraft = dependencies.aircraftRepository?.getAll() ?? [];
    const metrics = dependencies.analytics.calculate(vessels);
    const aircraftMetrics = dependencies.aircraftAnalytics?.calculate(aircraft);
    const selectedVessel = parsed.data.vesselId
      ? dependencies.repository.getById(parsed.data.vesselId)
      : undefined;
    const areaFocus = parsed.data.areaBounds
      ? resolveAreaBoundsFocus(parsed.data.areaBounds, vessels, aircraft)
      : resolveAreaFocus(parsed.data.question, vessels, aircraft);
    const landmarkContext = resolveLandmarkContext(
      parsed.data.question,
      vessels,
      selectedVessel,
      areaFocus
    );
    const aircraftIntel = selectRelevantAircraftIntel(
      parsed.data.aircraftIntel ?? [],
      new Set(aircraft.map((item) => item.id))
    );
    const vesselIntel = selectRelevantVesselIntel(
      parsed.data.vesselIntel ?? [],
      new Set(vessels.map((vessel) => vessel.id)),
      selectedVessel?.id
    );

    if (parsed.data.vesselId && !selectedVessel) {
      return reply.code(404).send({ error: "Requested vessel was not found." });
    }

    const context = {
      aircraft,
      request: parsed.data,
      vessels,
      metrics,
      ...(aircraftMetrics ? { aircraftMetrics } : {}),
      ...(selectedVessel ? { selectedVessel } : {}),
      ...(areaFocus ? { areaFocus } : {}),
      ...(landmarkContext ? { landmarkContext } : {}),
      ...(aircraftIntel.length > 0 ? { aircraftIntel } : {}),
      ...(vesselIntel.length > 0 ? { vesselIntel } : {})
    };

    const result = await dependencies.service.analyse(context);

    return areaFocus && !result.area
      ? {
          ...result,
          area: toAnalysisAreaResult(areaFocus)
        }
      : result;
  });
}

function selectRelevantVesselIntel<T extends { vesselId: string }>(
  vesselIntel: T[],
  knownVesselIds: Set<string>,
  selectedVesselId?: string
): T[] {
  const knownIntel = vesselIntel.filter((intel) => knownVesselIds.has(intel.vesselId));

  if (!selectedVesselId) {
    return knownIntel.slice(0, 8);
  }

  return knownIntel.filter((intel) => intel.vesselId === selectedVesselId).slice(0, 1);
}

function selectRelevantAircraftIntel<T extends { aircraftId: string }>(
  aircraftIntel: T[],
  knownAircraftIds: Set<string>
): T[] {
  return aircraftIntel.filter((intel) => knownAircraftIds.has(intel.aircraftId)).slice(0, 8);
}

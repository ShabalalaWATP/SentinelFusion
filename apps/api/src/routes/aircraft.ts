import type { FlightStreamStatus } from "@aisstream/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  IAircraftAnalyticsService,
  IAircraftIntelService,
  IAircraftRepository,
  IAirportContextService,
  IFlightRouteContextService
} from "../domain/interfaces";
import { isAuthorised } from "./auth";

const aircraftParamsSchema = z.object({
  id: z.string().min(1).max(80)
});
const airportContextQuerySchema = z.object({
  radiusKm: z.coerce.number().min(1).max(1000).optional()
});

type AircraftRouteDependencies = {
  repository: IAircraftRepository;
  analytics: IAircraftAnalyticsService;
  getStreamStatus?: () => FlightStreamStatus;
  intelService?: IAircraftIntelService;
  airportContextService?: IAirportContextService;
  filedRouteContextService?: IFlightRouteContextService;
  analysisApiToken?: string;
};

export async function registerAircraftRoutes(
  app: FastifyInstance,
  dependencies: AircraftRouteDependencies
): Promise<void> {
  app.get("/aircraft", async () => {
    const aircraft = dependencies.repository.getAll();
    const snapshot = {
      aircraft,
      metrics: dependencies.analytics.calculate(aircraft)
    };

    return dependencies.getStreamStatus
      ? {
          ...snapshot,
          stream: dependencies.getStreamStatus()
        }
      : snapshot;
  });

  app.post("/aircraft/:id/intel", async (request, reply) => {
    if (!isAuthorised(request, dependencies.analysisApiToken)) {
      return reply.code(401).send({ error: "Analysis token is required." });
    }

    if (!dependencies.intelService) {
      return reply.code(503).send({ error: "Aircraft intel service is unavailable." });
    }

    const parsed = aircraftParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Aircraft id is invalid." });
    }

    const aircraft = dependencies.repository.getById(parsed.data.id);
    if (!aircraft) {
      return reply.code(404).send({ error: "Requested aircraft was not found." });
    }

    return dependencies.intelService.enrich(aircraft);
  });

  app.get("/aircraft/:id/airport-context", async (request, reply) => {
    if (!dependencies.airportContextService) {
      return reply.code(503).send({ error: "Airport context service is unavailable." });
    }

    const parsed = aircraftParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Aircraft id is invalid." });
    }

    const query = airportContextQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Airport context query is invalid." });
    }

    const aircraft = dependencies.repository.getById(parsed.data.id);
    if (!aircraft) {
      return reply.code(404).send({ error: "Requested aircraft was not found." });
    }

    return dependencies.airportContextService.getNearbyAirports({
      latitude: aircraft.latitude,
      longitude: aircraft.longitude,
      aircraftId: aircraft.id,
      label: aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase(),
      ...(query.data.radiusKm === undefined ? {} : { radiusKm: query.data.radiusKm })
    });
  });

  app.get("/aircraft/:id/filed-route", async (request, reply) => {
    if (!dependencies.filedRouteContextService) {
      return reply.code(503).send({ error: "Filed route context service is unavailable." });
    }

    const parsed = aircraftParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Aircraft id is invalid." });
    }

    const aircraft = dependencies.repository.getById(parsed.data.id);
    if (!aircraft) {
      return reply.code(404).send({ error: "Requested aircraft was not found." });
    }

    return dependencies.filedRouteContextService.getFiledRoute(aircraft);
  });
}

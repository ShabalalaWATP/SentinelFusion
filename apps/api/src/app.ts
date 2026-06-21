import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import type { Aircraft, Vessel } from "@aisstream/shared";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { AisReplayStreamClient } from "./ais/ais-replay-stream-client";
import { AisStreamLiveClient } from "./ais/ais-stream-live-client";
import { AisStreamStatusTracker } from "./ais/ais-stream-status-tracker";
import { AisMessageNormaliser } from "./ais/ais-message-normaliser";
import { MockAisStreamClient } from "./ais/mock-ais-stream-client";
import { MockAnalysisAgentService } from "./analysis/mock-analysis-agent-service";
import { OpenAiAnalysisAgentService } from "./analysis/openai-analysis-agent-service";
import { AircraftAnalyticsService } from "./analytics/aircraft-analytics-service";
import { VesselAnalyticsService } from "./analytics/vessel-analytics-service";
import type { AppConfig } from "./config/environment";
import { createLoggerOptions } from "./config/logger";
import { AirspaceContextService } from "./context/airspace-context-service";
import { AirportContextService } from "./context/airport-context-service";
import { FireContextService } from "./context/fire-context-service";
import { MarineWeatherService } from "./context/marine-weather-service";
import type {
  IAisStreamClient,
  IAirspaceContextService,
  IAirportContextService,
  IFlightTrackingClient,
  IAnalysisAgentService,
  IAircraftIntelService,
  IFireContextService,
  IMarineWeatherService,
  IVesselIntelService
} from "./domain/interfaces";
import { InMemoryAircraftRepository } from "./domain/aircraft-repository";
import { InMemoryVesselRepository } from "./domain/vessel-repository";
import { AdsbExchangeFlightTrackingClient } from "./flights/adsb-exchange-flight-client";
import { FlightStreamStatusTracker } from "./flights/flight-stream-status-tracker";
import { MockFlightTrackingClient } from "./flights/mock-flight-tracking-client";
import { OpenSkyFlightTrackingClient } from "./flights/open-sky-flight-client";
import { MockAircraftIntelService } from "./intel/mock-aircraft-intel-service";
import { MockVesselIntelService } from "./intel/mock-vessel-intel-service";
import { OpenAiAircraftIntelService } from "./intel/openai-aircraft-intel-service";
import { OpenAiVesselIntelService } from "./intel/openai-vessel-intel-service";
import { RealtimeBroadcaster } from "./realtime/realtime-broadcaster";
import { registerAircraftRoutes } from "./routes/aircraft";
import { registerAirspaceContextRoute } from "./routes/airspace-context";
import { registerAnalysisRoute } from "./routes/analysis";
import { registerAirportContextRoute } from "./routes/airport-context";
import { registerFireContextRoute } from "./routes/fire-context";
import { registerFlightStatusRoute } from "./routes/flight-status";
import { registerHealthRoute } from "./routes/health";
import { registerMarineWeatherRoute } from "./routes/marine-weather";
import { registerStreamStatusRoute } from "./routes/stream-status";
import { registerVesselRoutes } from "./routes/vessels";
import { registerAircraftStream } from "./ws/aircraft-stream";
import { registerVesselStream } from "./ws/vessel-stream";

type CreateAppOptions = {
  analysisService?: IAnalysisAgentService;
  aircraftIntelService?: IAircraftIntelService;
  airspaceContextService?: IAirspaceContextService;
  airportContextService?: IAirportContextService;
  fireContextService?: IFireContextService;
  marineWeatherService?: IMarineWeatherService;
  vesselIntelService?: IVesselIntelService;
  seedAircraft?: Aircraft[];
  seedVessels?: Vessel[];
  startStreams?: boolean;
};

const REALTIME_FLUSH_INTERVAL_MS = 1000;
const REPOSITORY_PRUNE_INTERVAL_MS = 30000;

export async function createApp(
  config: AppConfig,
  options: CreateAppOptions = {}
): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: createLoggerOptions(config),
    trustProxy: config.trustProxy
  });
  const repository = new InMemoryVesselRepository();
  const aircraftRepository = new InMemoryAircraftRepository();
  const analytics = new VesselAnalyticsService();
  const aircraftAnalytics = new AircraftAnalyticsService();
  const broadcaster = new RealtimeBroadcaster();
  const aircraftBroadcaster = new RealtimeBroadcaster();
  const normaliser = new AisMessageNormaliser();
  const streamStatus = new AisStreamStatusTracker(config);
  const flightStatus = new FlightStreamStatusTracker(config);
  const streamClient = createStreamClient(config);
  const flightClient = createFlightClient(config);
  const analysisService = options.analysisService ?? createAnalysisService(config);
  const aircraftIntelService =
    options.aircraftIntelService ?? createAircraftIntelService(config);
  const airspaceContextService =
    options.airspaceContextService ?? createAirspaceContextService(config);
  const airportContextService =
    options.airportContextService ?? createAirportContextService(config);
  const fireContextService = options.fireContextService ?? createFireContextService(config);
  const marineWeatherService =
    options.marineWeatherService ?? createMarineWeatherService(config);
  const vesselIntelService = options.vesselIntelService ?? createVesselIntelService(config);

  options.seedAircraft?.forEach((aircraft) => aircraftRepository.upsert(aircraft));
  options.seedVessels?.forEach((vessel) => repository.upsert(vessel));

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow
  });
  await app.register(websocket);
  await registerHealthRoute(app, config);
  await registerAirspaceContextRoute(app, {
    service: airspaceContextService
  });
  await registerAirportContextRoute(app, {
    service: airportContextService
  });
  await registerMarineWeatherRoute(app, {
    service: marineWeatherService
  });
  await registerFireContextRoute(app, {
    service: fireContextService
  });
  await registerAircraftRoutes(app, {
    repository: aircraftRepository,
    analytics: aircraftAnalytics,
    getStreamStatus: () => flightStatus.snapshot(),
    intelService: aircraftIntelService,
    airportContextService,
    ...(config.analysisApiToken ? { analysisApiToken: config.analysisApiToken } : {})
  });
  await registerAnalysisRoute(app, {
    aircraftAnalytics,
    aircraftRepository,
    analytics,
    config,
    repository,
    service: analysisService
  });
  await registerVesselRoutes(app, {
    repository,
    analytics,
    getStreamStatus: () => streamStatus.snapshot(),
    intelService: vesselIntelService,
    ...(config.analysisApiToken ? { analysisApiToken: config.analysisApiToken } : {})
  });
  await registerFlightStatusRoute(app, () => flightStatus.snapshot());
  await registerStreamStatusRoute(app, () => streamStatus.snapshot());
  await registerAircraftStream(app, {
    analytics: aircraftAnalytics,
    broadcaster: aircraftBroadcaster,
    config,
    repository: aircraftRepository
  });
  await registerVesselStream(app, {
    analytics,
    broadcaster,
    config,
    repository
  });

  let unsubscribe: (() => void) | undefined;
  let unsubscribeFlights: (() => void) | undefined;
  let flushTimer: NodeJS.Timeout | undefined;
  let pruneTimer: NodeJS.Timeout | undefined;
  const pendingVessels = new Map<string, Vessel>();
  const pendingAircraft = new Map<string, Aircraft>();
  const flushRealtime = (): void => {
    if (pendingVessels.size > 0) {
      const changedVessels = [...pendingVessels.values()].sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      pendingVessels.clear();
      const vessels = repository.getAll();

      broadcaster.broadcast({
        kind: "batch",
        vessels: changedVessels,
        metrics: analytics.calculate(vessels),
        sentAt: new Date().toISOString()
      });
    }

    if (pendingAircraft.size > 0) {
      const changedAircraft = [...pendingAircraft.values()].sort((left, right) =>
        aircraftLabel(left).localeCompare(aircraftLabel(right))
      );
      pendingAircraft.clear();
      const aircraft = aircraftRepository.getAll();

      aircraftBroadcaster.broadcast({
        kind: "batch",
        aircraft: changedAircraft,
        metrics: aircraftAnalytics.calculate(aircraft),
        sentAt: new Date().toISOString()
      });
    }
  };

  if (options.startStreams ?? true) {
    flushTimer = setInterval(flushRealtime, REALTIME_FLUSH_INTERVAL_MS);
    pruneTimer = setInterval(() => {
      repository.prune();
    }, REPOSITORY_PRUNE_INTERVAL_MS);
    unsubscribe = streamClient.subscribe((message) => {
      streamStatus.recordMessage(message);
      const previous = repository.getById(`mmsi-${message.mmsi}`);
      const vessel = repository.upsert(normaliser.normalise(message, previous));
      streamStatus.record({ type: "normalised" });
      pendingVessels.set(vessel.id, vessel);
    }, (event) => streamStatus.record(event));
    unsubscribeFlights = flightClient.subscribe((aircraftBatch) => {
      aircraftRepository.replaceAll(aircraftBatch).forEach((aircraft) => {
        pendingAircraft.set(aircraft.id, aircraft);
      });
      flightStatus.recordAircraft(aircraftBatch.length);
    }, (event) => flightStatus.record(event));
  }

  app.addHook("onClose", async () => {
    flushRealtime();
    if (flushTimer) {
      clearInterval(flushTimer);
    }
    if (pruneTimer) {
      clearInterval(pruneTimer);
    }
    unsubscribe?.();
    unsubscribeFlights?.();
  });

  return app;
}

function createStreamClient(config: AppConfig): IAisStreamClient {
  if (config.aisMode === "live") {
    return new AisStreamLiveClient(config);
  }

  if (config.aisMode === "replay") {
    return new AisReplayStreamClient(config);
  }

  return new MockAisStreamClient(config.mockStreamIntervalMs);
}

function createFlightClient(config: AppConfig): IFlightTrackingClient {
  if (config.flightMode === "live") {
    if (config.flightProvider === "opensky") {
      return new OpenSkyFlightTrackingClient(config);
    }

    if (config.flightProvider === "adsbexchange") {
      return new AdsbExchangeFlightTrackingClient(config);
    }

    throw new Error(`Flight provider ${config.flightProvider} is not implemented yet.`);
  }

  return new MockFlightTrackingClient(config.flightPollIntervalMs);
}

function createAnalysisService(config: AppConfig): IAnalysisAgentService {
  if (config.analysisMode === "live") {
    return new OpenAiAnalysisAgentService(config);
  }

  return new MockAnalysisAgentService();
}

function createVesselIntelService(config: AppConfig): IVesselIntelService {
  if (config.analysisMode === "live") {
    return new OpenAiVesselIntelService(config);
  }

  return new MockVesselIntelService();
}

function createAircraftIntelService(config: AppConfig): IAircraftIntelService {
  if (config.analysisMode === "live") {
    return new OpenAiAircraftIntelService(config);
  }

  return new MockAircraftIntelService();
}

function createAirportContextService(config: AppConfig): IAirportContextService {
  return new AirportContextService(config);
}

function createAirspaceContextService(config: AppConfig): IAirspaceContextService {
  return new AirspaceContextService(config);
}

function createMarineWeatherService(config: AppConfig): IMarineWeatherService {
  return new MarineWeatherService(config);
}

function createFireContextService(config: AppConfig): IFireContextService {
  return new FireContextService(config);
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24;
}

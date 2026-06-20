import type {
  AisRawMessage,
  AisStreamState,
  Aircraft,
  AircraftIntelResponse,
  AircraftMetrics,
  AircraftStreamEnvelope,
  AnalysisAircraftIntelContext,
  AnalysisRequest,
  AnalysisSummary,
  AnalysisVesselIntelContext,
  Vessel,
  VesselIntelResponse,
  VesselMetrics,
  VesselStreamEnvelope
} from "@aisstream/shared";
import type { WebSocket } from "ws";

export type AisStreamLifecycleEvent =
  | {
      type: "state";
      state: AisStreamState;
      connected: boolean;
    }
  | {
      type: "message";
      sourceTimestamp?: string;
    }
  | {
      type: "normalised";
    }
  | {
      type: "dropped";
      reason: string;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "reconnect";
      attempt: number;
    };

export interface IAisStreamClient {
  subscribe(
    onMessage: (message: AisRawMessage) => void,
    onEvent?: (event: AisStreamLifecycleEvent) => void
  ): () => void;
}

export interface IAisMessageNormaliser {
  normalise(message: AisRawMessage, previous?: Vessel): Vessel;
}

export interface IVesselRepository {
  getAll(): Vessel[];
  getById(id: string): Vessel | undefined;
  prune?(now?: Date): number;
  upsert(vessel: Vessel): Vessel;
}

export interface IVesselAnalyticsService {
  calculate(vessels: Vessel[], now?: Date): VesselMetrics;
}

export interface IRealtimeBroadcaster {
  addClient(client: WebSocket): void;
  broadcast(envelope: VesselStreamEnvelope): void;
  clientCount(): number;
}

export type FlightStreamLifecycleEvent =
  | {
      type: "state";
      state: AisStreamState;
      connected: boolean;
    }
  | {
      type: "message";
      sourceTimestamp?: string;
    }
  | {
      type: "normalised";
    }
  | {
      type: "dropped";
      reason: string;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "reconnect";
      attempt: number;
    };

export interface IFlightTrackingClient {
  subscribe(
    onAircraft: (aircraft: Aircraft[]) => void,
    onEvent?: (event: FlightStreamLifecycleEvent) => void
  ): () => void;
}

export interface IAircraftRepository {
  getAll(): Aircraft[];
  getById(id: string): Aircraft | undefined;
  replaceAll(aircraft: Aircraft[]): Aircraft[];
  upsert(aircraft: Aircraft): Aircraft;
  upsertMany(aircraft: Aircraft[]): Aircraft[];
}

export interface IAircraftAnalyticsService {
  calculate(aircraft: Aircraft[], now?: Date): AircraftMetrics;
}

export interface IAircraftRealtimeBroadcaster {
  addClient(client: WebSocket): void;
  broadcast(envelope: AircraftStreamEnvelope): void;
  clientCount(): number;
}

export type AnalysisContext = {
  aircraft: Aircraft[];
  aircraftMetrics?: AircraftMetrics;
  request: AnalysisRequest;
  vessels: Vessel[];
  metrics: VesselMetrics;
  selectedVessel?: Vessel;
  areaFocus?: AnalysisAreaFocus;
  landmarkContext?: AnalysisLandmarkContext;
  aircraftIntel?: AnalysisAircraftIntelContext[];
  vesselIntel?: AnalysisVesselIntelContext[];
};

export type AnalysisAreaFocus = {
  id: string;
  name: string;
  matchedText: string;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  vesselCount: number;
  highRiskVessels: number;
  militaryVessels: number;
  averageSpeed: number;
  vessels: Vessel[];
  aircraftCount: number;
  militaryAircraft: number;
  emergencyAircraft: number;
  averageAircraftAltitudeFt: number;
  averageAircraftSpeedKt: number;
  aircraft: Aircraft[];
};

export type AnalysisLandmark = {
  id: string;
  name: string;
  category: "port" | "naval_base" | "strait" | "canal" | "landmark" | "airport";
  aliases: string[];
  latitude: number;
  longitude: number;
  distanceNm?: number;
  bearingDegrees?: number;
};

export type AnalysisLandmarkContext = {
  matchedText?: string;
  reference: "selected_vessel" | "area" | "question" | "fleet";
  landmarks: AnalysisLandmark[];
};

export interface IAnalysisAgentService {
  analyse(context: AnalysisContext): Promise<AnalysisSummary>;
}

export interface IVesselIntelService {
  enrich(vessel: Vessel): Promise<VesselIntelResponse>;
}

export interface IAircraftIntelService {
  enrich(aircraft: Aircraft): Promise<AircraftIntelResponse>;
}

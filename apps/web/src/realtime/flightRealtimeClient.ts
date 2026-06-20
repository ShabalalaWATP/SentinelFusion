import {
  aircraftStreamEnvelopeSchema,
  type AircraftStreamEnvelope
} from "@aisstream/shared";
import { env } from "../config/env";
import type { ConnectionStatus } from "./realtimeClient";

type FlightRealtimeHandlers = {
  onMessage(envelope: AircraftStreamEnvelope): void;
  onStatus(status: ConnectionStatus): void;
  onError(error: Error): void;
};

export type FlightRealtimeClient = {
  connect(handlers: FlightRealtimeHandlers): () => void;
};

export function createFlightRealtimeClient(url: string): FlightRealtimeClient {
  return {
    connect(handlers) {
      handlers.onStatus("connecting");
      const socket = new WebSocket(url);

      socket.addEventListener("open", () => handlers.onStatus("open"));
      socket.addEventListener("close", () => handlers.onStatus("closed"));
      socket.addEventListener("error", () => {
        handlers.onStatus("error");
        handlers.onError(new Error("Flight realtime connection failed"));
      });
      socket.addEventListener("message", (event) => {
        try {
          const raw = JSON.parse(String(event.data));
          handlers.onMessage(aircraftStreamEnvelopeSchema.parse(raw));
        } catch (error) {
          handlers.onError(error instanceof Error ? error : new Error("Invalid aircraft payload"));
        }
      });

      return () => {
        socket.close(1000, "dashboard unmounted");
      };
    }
  };
}

export const flightRealtimeClient = createFlightRealtimeClient(env.flightWsUrl);

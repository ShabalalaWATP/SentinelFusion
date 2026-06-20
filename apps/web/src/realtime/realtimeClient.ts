import {
  vesselStreamEnvelopeSchema,
  type VesselStreamEnvelope
} from "@aisstream/shared";
import { env } from "../config/env";

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

type RealtimeHandlers = {
  onMessage(envelope: VesselStreamEnvelope): void;
  onStatus(status: ConnectionStatus): void;
  onError(error: Error): void;
};

export type RealtimeClient = {
  connect(handlers: RealtimeHandlers): () => void;
};

export function createRealtimeClient(url: string): RealtimeClient {
  return {
    connect(handlers) {
      handlers.onStatus("connecting");
      const socket = new WebSocket(url);

      socket.addEventListener("open", () => handlers.onStatus("open"));
      socket.addEventListener("close", () => handlers.onStatus("closed"));
      socket.addEventListener("error", () => {
        handlers.onStatus("error");
        handlers.onError(new Error("Realtime connection failed"));
      });
      socket.addEventListener("message", (event) => {
        try {
          const raw = JSON.parse(String(event.data));
          handlers.onMessage(vesselStreamEnvelopeSchema.parse(raw));
        } catch (error) {
          handlers.onError(error instanceof Error ? error : new Error("Invalid realtime payload"));
        }
      });

      return () => {
        socket.close(1000, "dashboard unmounted");
      };
    }
  };
}

export const realtimeClient = createRealtimeClient(env.wsUrl);

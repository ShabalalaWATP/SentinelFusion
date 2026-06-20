import WebSocket from "ws";
import type { AppConfig } from "../config/environment";
import type { AisStreamLifecycleEvent, IAisStreamClient } from "../domain/interfaces";
import { parseAisStreamEnvelope } from "./aisstream-message-parser";

type EventHandler = (event: AisStreamLifecycleEvent) => void;

type AisStreamSubscription = {
  APIKey: string;
  BoundingBoxes: AppConfig["aisstreamBoundingBoxes"];
  FiltersShipMMSI?: string[];
  FilterMessageTypes?: string[];
};

export class AisStreamLiveClient implements IAisStreamClient {
  private socket: WebSocket | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private heartbeatTimer: NodeJS.Timeout | undefined;
  private stopped = true;
  private reconnectAttempt = 0;

  constructor(private readonly config: AppConfig) {}

  subscribe(
    onMessage: Parameters<IAisStreamClient["subscribe"]>[0],
    onEvent: EventHandler = () => undefined
  ): () => void {
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.open(onMessage, onEvent);

    return () => this.stop(onEvent);
  }

  private open(
    onMessage: Parameters<IAisStreamClient["subscribe"]>[0],
    onEvent: EventHandler
  ): void {
    const apiKey = this.config.aisstreamApiKey;
    if (!apiKey) {
      onEvent({ type: "error", message: "AISSTREAM_API_KEY is required for live mode." });
      onEvent({ type: "state", state: "error", connected: false });
      return;
    }

    if (this.stopped) {
      return;
    }

    onEvent({ type: "state", state: "connecting", connected: false });
    const socket = new WebSocket(this.config.aisstreamUrl);
    this.socket = socket;

    socket.on("open", () => {
      this.reconnectAttempt = 0;
      socket.send(JSON.stringify(this.buildSubscription(apiKey)));
      onEvent({ type: "state", state: "subscribed", connected: true });
      this.startHeartbeat(socket, onEvent);
    });

    socket.on("message", (data) => {
      const parsed = parseFrame(data.toString());
      if (!parsed.ok) {
        onEvent({ type: "dropped", reason: parsed.reason });
        return;
      }

      const result = parseAisStreamEnvelope(parsed.value);
      if (result.kind === "message") {
        onMessage(result.message);
        return;
      }

      if (result.kind === "dropped") {
        onEvent({ type: "dropped", reason: result.reason });
        return;
      }

      onEvent({ type: "error", message: result.message });
      if (isCredentialError(result.message)) {
        this.stopped = true;
        this.clearTimers();
        socket.close();
        onEvent({ type: "state", state: "error", connected: false });
      }
    });

    socket.on("error", (error) => {
      onEvent({ type: "error", message: error.message });
    });

    socket.on("close", () => {
      this.clearHeartbeat();
      if (this.stopped) {
        return;
      }

      onEvent({ type: "state", state: "reconnecting", connected: false });
      this.scheduleReconnect(onMessage, onEvent);
    });
  }

  private buildSubscription(apiKey: string): AisStreamSubscription {
    const subscription: AisStreamSubscription = {
      APIKey: apiKey,
      BoundingBoxes: this.config.aisstreamBoundingBoxes
    };

    if (this.config.aisstreamFilterMMSI.length > 0) {
      subscription.FiltersShipMMSI = this.config.aisstreamFilterMMSI;
    }

    if (this.config.aisstreamFilterMessageTypes.length > 0) {
      subscription.FilterMessageTypes = this.config.aisstreamFilterMessageTypes;
    }

    return subscription;
  }

  private scheduleReconnect(
    onMessage: Parameters<IAisStreamClient["subscribe"]>[0],
    onEvent: EventHandler
  ): void {
    this.reconnectAttempt += 1;
    onEvent({ type: "reconnect", attempt: this.reconnectAttempt });
    const delayMs = Math.min(
      this.config.aisstreamReconnectMaxMs,
      this.config.aisstreamReconnectBaseMs * 2 ** (this.reconnectAttempt - 1)
    );

    this.reconnectTimer = setTimeout(() => {
      this.open(onMessage, onEvent);
    }, delayMs);
  }

  private startHeartbeat(socket: WebSocket, onEvent: EventHandler): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        socket.ping();
      } catch (error) {
        onEvent({
          type: "error",
          message: error instanceof Error ? error.message : "AISstream heartbeat failed."
        });
        socket.terminate();
      }
    }, this.config.aisstreamHeartbeatMs);
  }

  private stop(onEvent: EventHandler): void {
    this.stopped = true;
    this.clearTimers();
    const socket = this.socket;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    onEvent({ type: "state", state: "closed", connected: false });
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.clearHeartbeat();
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}

function parseFrame(frame: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(frame) };
  } catch {
    return { ok: false, reason: "AISstream frame was not valid JSON." };
  }
}

function isCredentialError(message: string): boolean {
  return /api\s*key|credential|not valid|unauthori[sz]ed/i.test(message);
}

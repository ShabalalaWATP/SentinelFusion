import type { AisRawMessage, AisStreamStatus } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { AisStreamLifecycleEvent } from "../domain/interfaces";

const MAX_ERROR_LENGTH = 240;

export class AisStreamStatusTracker {
  private state: AisStreamStatus["state"] = "idle";
  private connected = false;
  private messagesReceived = 0;
  private messagesNormalised = 0;
  private messagesDropped = 0;
  private errors = 0;
  private reconnectAttempts = 0;
  private lastMessageAt: string | undefined;
  private lastError: string | undefined;
  private dataLatencyMs: number | undefined;

  constructor(private readonly config: AppConfig) {}

  record(event: AisStreamLifecycleEvent): void {
    if (event.type === "state") {
      this.state = event.state;
      this.connected = event.connected;
      return;
    }

    if (event.type === "message") {
      this.messagesReceived += 1;
      this.lastMessageAt = new Date().toISOString();
      if (this.connected && this.errors === 0) {
        this.lastError = undefined;
      }
      if (event.sourceTimestamp) {
        this.dataLatencyMs = calculateLatency(event.sourceTimestamp);
      }
      return;
    }

    if (event.type === "normalised") {
      this.messagesNormalised += 1;
      return;
    }

    if (event.type === "dropped") {
      this.messagesDropped += 1;
      return;
    }

    if (event.type === "error") {
      this.errors += 1;
      this.lastError = truncate(event.message);
      return;
    }

    this.reconnectAttempts = event.attempt;
  }

  recordMessage(message: AisRawMessage): void {
    this.record({ type: "message", sourceTimestamp: message.timestamp });
  }

  snapshot(): AisStreamStatus {
    const status: AisStreamStatus = {
      mode: this.config.aisMode,
      state: this.state,
      connected: this.connected,
      messagesReceived: this.messagesReceived,
      messagesNormalised: this.messagesNormalised,
      messagesDropped: this.messagesDropped,
      errors: this.errors,
      reconnectAttempts: this.reconnectAttempts,
      subscription: {
        boundingBoxes: this.config.aisstreamBoundingBoxes,
        filtersShipMMSI: this.config.aisstreamFilterMMSI,
        filterMessageTypes: this.config.aisstreamFilterMessageTypes
      }
    };

    if (this.config.aisMode === "live") {
      status.subscription.endpoint = this.config.aisstreamUrl;
    }

    if (this.lastMessageAt) {
      status.lastMessageAt = this.lastMessageAt;
    }

    if (this.lastError) {
      status.lastError = this.lastError;
    }

    if (this.dataLatencyMs !== undefined) {
      status.dataLatencyMs = this.dataLatencyMs;
    }

    return status;
  }
}

function calculateLatency(timestamp: string): number {
  const eventTime = new Date(timestamp).getTime();
  return Number.isNaN(eventTime) ? 0 : Math.max(0, Date.now() - eventTime);
}

function truncate(value: string): string {
  return value.length > MAX_ERROR_LENGTH ? value.slice(0, MAX_ERROR_LENGTH) : value;
}

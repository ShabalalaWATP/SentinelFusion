import type { FlightStreamStatus } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { FlightStreamLifecycleEvent } from "../domain/interfaces";

const MAX_ERROR_LENGTH = 240;

export class FlightStreamStatusTracker {
  private state: FlightStreamStatus["state"] = "idle";
  private connected = false;
  private aircraftReceived = 0;
  private aircraftNormalised = 0;
  private aircraftDropped = 0;
  private errors = 0;
  private reconnectAttempts = 0;
  private lastMessageAt: string | undefined;
  private lastError: string | undefined;
  private dataLatencyMs: number | undefined;

  constructor(private readonly config: AppConfig) {}

  record(event: FlightStreamLifecycleEvent): void {
    if (event.type === "state") {
      this.state = event.state;
      this.connected = event.connected;
      return;
    }

    if (event.type === "message") {
      this.aircraftReceived += 1;
      this.lastMessageAt = new Date().toISOString();
      this.lastError = undefined;
      if (event.sourceTimestamp) {
        this.dataLatencyMs = calculateLatency(event.sourceTimestamp);
      }
      return;
    }

    if (event.type === "normalised") {
      this.aircraftNormalised += 1;
      return;
    }

    if (event.type === "dropped") {
      this.aircraftDropped += 1;
      this.lastError = truncate(event.reason);
      return;
    }

    if (event.type === "error") {
      this.errors += 1;
      this.lastError = truncate(event.message);
      return;
    }

    this.reconnectAttempts = event.attempt;
  }

  recordAircraft(count: number): void {
    this.aircraftNormalised += count;
  }

  snapshot(): FlightStreamStatus {
    const status: FlightStreamStatus = {
      mode: this.config.flightMode,
      provider: this.config.flightProvider,
      state: this.state,
      connected: this.connected,
      aircraftReceived: this.aircraftReceived,
      aircraftNormalised: this.aircraftNormalised,
      aircraftDropped: this.aircraftDropped,
      errors: this.errors,
      reconnectAttempts: this.reconnectAttempts,
      subscription: {
        boundingBoxes: this.config.flightBoundingBoxes
      }
    };

    if (this.config.flightMode === "live" && this.config.flightApiBaseUrl) {
      status.subscription.endpoint = this.config.flightApiBaseUrl;
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

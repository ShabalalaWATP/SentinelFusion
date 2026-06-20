import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AisRawMessage } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { AisStreamLifecycleEvent, IAisStreamClient } from "../domain/interfaces";
import { parseAisStreamEnvelope } from "./aisstream-message-parser";

type EventHandler = (event: AisStreamLifecycleEvent) => void;

const DEFAULT_REPLAY_FILE = resolve(__dirname, "../../fixtures/aisstream-replay.jsonl");

export class AisReplayStreamClient implements IAisStreamClient {
  constructor(private readonly config: AppConfig) {}

  subscribe(
    onMessage: (message: AisRawMessage) => void,
    onEvent: EventHandler = () => undefined
  ): () => void {
    const messages = this.loadMessages(onEvent);
    if (messages.length === 0) {
      onEvent({ type: "state", state: "error", connected: false });
      return () => onEvent({ type: "state", state: "closed", connected: false });
    }

    let index = 0;
    const emit = () => {
      onMessage(messages[index]!);
      index = (index + 1) % messages.length;
    };

    onEvent({ type: "state", state: "subscribed", connected: true });
    emit();
    const timer = setInterval(emit, this.config.mockStreamIntervalMs);

    return () => {
      clearInterval(timer);
      onEvent({ type: "state", state: "closed", connected: false });
    };
  }

  private loadMessages(onEvent: EventHandler): AisRawMessage[] {
    const filePath = this.config.aisReplayFile ?? DEFAULT_REPLAY_FILE;

    try {
      const lines = readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      return lines.flatMap((line) => {
        try {
          const result = parseAisStreamEnvelope(JSON.parse(line));
          if (result.kind === "message") {
            return [result.message];
          }

          if (result.kind === "error") {
            onEvent({ type: "error", message: result.message });
            return [];
          }

          onEvent({ type: "dropped", reason: result.reason });
          return [];
        } catch {
          onEvent({ type: "dropped", reason: "Replay fixture line was not valid JSON." });
          return [];
        }
      });
    } catch (error) {
      onEvent({
        type: "error",
        message: error instanceof Error ? error.message : "Replay fixture could not be read."
      });
      return [];
    }
  }
}

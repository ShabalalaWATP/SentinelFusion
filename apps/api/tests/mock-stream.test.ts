import { describe, expect, it } from "vitest";
import { AisMessageNormaliser } from "../src/ais/ais-message-normaliser";
import { MockAisStreamClient } from "../src/ais/mock-ais-stream-client";

describe("mock AIS stream", () => {
  it("emits valid synthetic AIS messages", async () => {
    const client = new MockAisStreamClient(1000);
    const normaliser = new AisMessageNormaliser();
    const messages = new Set<string>();

    const stop = client.subscribe((message) => {
      messages.add(normaliser.normalise(message).mmsi);
    });
    stop();

    expect(messages.size).toBeGreaterThan(5);
  });
});

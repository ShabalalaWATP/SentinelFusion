import type { AircraftStreamEnvelope, VesselStreamEnvelope } from "@aisstream/shared";
import type { WebSocket } from "ws";
import { WebSocket as WebSocketState } from "ws";
import type { IRealtimeBroadcaster } from "../domain/interfaces";

type RealtimeEnvelope = AircraftStreamEnvelope | VesselStreamEnvelope;

export class RealtimeBroadcaster implements IRealtimeBroadcaster {
  private readonly clients = new Set<WebSocket>();

  addClient(client: WebSocket): void {
    this.clients.add(client);
    client.on("close", () => this.clients.delete(client));
    client.on("error", () => this.clients.delete(client));
  }

  broadcast(envelope: RealtimeEnvelope): void {
    const payload = JSON.stringify(envelope);

    for (const client of this.clients) {
      if (client.readyState === WebSocketState.OPEN) {
        client.send(payload);
      }
    }
  }

  clientCount(): number {
    return this.clients.size;
  }
}

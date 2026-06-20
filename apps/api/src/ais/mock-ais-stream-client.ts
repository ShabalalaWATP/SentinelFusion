import type { AisRawMessage } from "@aisstream/shared";
import type { AisStreamLifecycleEvent, IAisStreamClient } from "../domain/interfaces";

type MockVesselSeed = Omit<AisRawMessage, "timestamp">;

const vesselSeeds: MockVesselSeed[] = [
  vessel("232001234", "NORTHERN LIGHT", "Cargo", 1.3, 51.95, 13.2, 76, "Felixstowe"),
  vessel("232001235", "CHANNEL STAR", "Tanker", 1.1, 51.7, 11.6, 102, "Rotterdam"),
  vessel("232001236", "MERIDIAN BAY", "Container", 1.55, 51.85, 18.4, 64, "Hamburg"),
  vessel("232001237", "THAMES PILOT", "Pilot", 0.95, 51.55, 8.1, 40, "London"),
  vessel("232001238", "ORION TRADER", "Cargo", 1.85, 52.1, 15.7, 82, "Antwerp"),
  vessel("232001239", "EASTERN TIDE", "Passenger", 1.02, 51.42, 21.2, 118, "Dover"),
  vessel("232001240", "SOLENT GUARD", "SAR", -1.18, 50.72, 25.4, 260, "Portsmouth"),
  vessel("232001241", "ATLANTIC ROSE", "Fishing", 0.1, 50.95, 5.6, 183, "Ramsgate"),
  vessel("232001242", "BALTIC PEARL", "Cargo", 2.02, 51.6, 12.2, 91, "Zeebrugge"),
  vessel("232001243", "NORTH SEA VENTURE", "Offshore", 2.35, 52.18, 7.4, 18, "Great Yarmouth"),
  vessel("232001244", "HARBOUR DAWN", "Tug", 1.28, 51.88, 6.8, 132, "Harwich"),
  vessel("232001245", "CELTIC ROUTE", "Ro-Ro", -0.25, 50.82, 19.8, 247, "Southampton")
];

export class MockAisStreamClient implements IAisStreamClient {
  private tick = 0;
  private readonly state = vesselSeeds.map((seed) => ({ ...seed }));

  constructor(private readonly intervalMs: number) {}

  subscribe(
    onMessage: (message: AisRawMessage) => void,
    onEvent: (event: AisStreamLifecycleEvent) => void = () => undefined
  ): () => void {
    onEvent({ type: "state", state: "subscribed", connected: true });
    this.state.forEach((seed) => onMessage(this.toMessage(seed)));

    const timer = setInterval(() => {
      const index = this.tick % this.state.length;
      const next = this.advance(this.state[index]!, this.tick);
      this.state[index] = next;
      this.tick += 1;
      onMessage(this.toMessage(next));
    }, this.intervalMs);

    return () => {
      clearInterval(timer);
      onEvent({ type: "state", state: "closed", connected: false });
    };
  }

  private advance(seed: MockVesselSeed, tick: number): MockVesselSeed {
    const courseRadians = (seed.courseOverGround * Math.PI) / 180;
    const speedFactor = Math.max(seed.speedOverGround, 2) / 8000;
    const drift = Math.sin(tick / 8) * 0.004;

    return {
      ...seed,
      longitude: normaliseLongitude(seed.longitude + Math.sin(courseRadians) * speedFactor + drift),
      latitude: clampLatitude(seed.latitude + Math.cos(courseRadians) * speedFactor),
      courseOverGround: (seed.courseOverGround + Math.sin(tick / 5) * 1.8 + 360) % 360,
      speedOverGround: Number(Math.max(0, seed.speedOverGround + Math.sin(tick / 4) * 0.3).toFixed(1))
    };
  }

  private toMessage(seed: MockVesselSeed): AisRawMessage {
    return {
      ...seed,
      timestamp: new Date().toISOString()
    };
  }
}

function vessel(
  mmsi: string,
  name: string,
  shipType: string,
  longitude: number,
  latitude: number,
  speedOverGround: number,
  courseOverGround: number,
  destination: string
): MockVesselSeed {
  return {
    mmsi,
    name,
    callSign: name.slice(0, 5).replace(/\s/g, ""),
    shipType,
    longitude,
    latitude,
    speedOverGround,
    courseOverGround,
    heading: courseOverGround,
    destination,
    navigationalStatus: speedOverGround > 20 ? "Restricted manoeuvrability" : "Under way using engine"
  };
}

function normaliseLongitude(value: number): number {
  if (value > 180) {
    return value - 360;
  }

  if (value < -180) {
    return value + 360;
  }

  return Number(value.toFixed(6));
}

function clampLatitude(value: number): number {
  return Number(Math.max(-85, Math.min(85, value)).toFixed(6));
}

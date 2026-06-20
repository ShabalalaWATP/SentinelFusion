import type { Aircraft } from "@aisstream/shared";
import { z } from "zod";
import type { AppConfig, AisBoundingBox } from "../config/environment";
import type { FlightStreamLifecycleEvent, IFlightTrackingClient } from "../domain/interfaces";
import {
  buildAircraftTrack,
  boundedLatitude,
  boundedLongitude,
  classifyAndRisk,
  cleanOptionalString,
  finiteNumber,
  isEmergencySquawk,
  metresAltitudeToFeet,
  metresPerSecondToFpm,
  metresPerSecondToKt,
  normaliseHeading,
  timestampFromSeconds,
  type AircraftTrackState
} from "./flight-normalisation";

const defaultOpenSkyUrl = "https://opensky-network.org/api";
const defaultOpenSkyTokenUrl =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const tokenRefreshMarginMs = 30000;
const defaultRetryAfterMs = 60000;

const openSkyResponseSchema = z.object({
  time: z.number().optional(),
  states: z.array(z.array(z.unknown())).nullable().optional()
});

const openSkyTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().optional()
});

export class OpenSkyFlightTrackingClient implements IFlightTrackingClient {
  private readonly baseUrl: string;
  private readonly tracks: AircraftTrackState = new Map();
  private readonly tokenManager: OpenSkyTokenManager;

  constructor(private readonly config: AppConfig) {
    this.baseUrl = (config.flightApiBaseUrl ?? defaultOpenSkyUrl).replace(/\/$/, "");
    this.tokenManager = new OpenSkyTokenManager(config);
  }

  subscribe(
    onAircraft: (aircraft: Aircraft[]) => void,
    onEvent?: (event: FlightStreamLifecycleEvent) => void
  ): () => void {
    let stopped = false;
    let timer: NodeJS.Timeout | undefined;
    onEvent?.({ type: "state", state: "subscribed", connected: true });

    const schedule = (delayMs: number): void => {
      if (stopped) {
        return;
      }

      timer = setTimeout(() => void poll(), Math.max(0, delayMs));
    };

    const poll = async (): Promise<void> => {
      if (stopped) {
        return;
      }

      try {
        const aircraft = await this.fetchAircraft();
        const sourceTimestamp = aircraft[0]?.lastUpdated ?? new Date().toISOString();
        onEvent?.({ type: "message", sourceTimestamp });
        onAircraft(aircraft);
        schedule(this.config.flightPollIntervalMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : "OpenSky request failed";
        onEvent?.({
          type: "error",
          message
        });
        schedule(error instanceof OpenSkyRateLimitError ? error.retryAfterMs : this.config.flightPollIntervalMs);
      }
    };

    schedule(0);

    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      onEvent?.({ type: "state", state: "closed", connected: false });
    };
  }

  private async fetchAircraft(): Promise<Aircraft[]> {
    const batches = await Promise.all(
      this.config.flightBoundingBoxes.map((bounds) => this.fetchBoundingBox(bounds))
    );
    const aircraftById = new Map<string, Aircraft>();

    batches.flat().forEach((aircraft) => {
      aircraftById.set(aircraft.id, aircraft);
    });

    return [...aircraftById.values()];
  }

  private async fetchBoundingBox(bounds: AisBoundingBox): Promise<Aircraft[]> {
    const now = new Date();
    const url = new URL(`${this.baseUrl}/states/all`);
    url.searchParams.set("extended", "1");
    url.searchParams.set("lamin", String(bounds[0][0]));
    url.searchParams.set("lomin", String(bounds[0][1]));
    url.searchParams.set("lamax", String(bounds[1][0]));
    url.searchParams.set("lomax", String(bounds[1][1]));

    const response = await this.fetchOpenSky(url);
    if (response.status === 429) {
      throw OpenSkyRateLimitError.fromResponse(response);
    }

    if (!response.ok) {
      throw new Error(`OpenSky returned HTTP ${response.status}`);
    }

    const payload = openSkyResponseSchema.parse(await response.json());
    const responseTime = timestampFromSeconds(payload.time, now);

    return (payload.states ?? [])
      .map((state) => normaliseOpenSkyState(state, responseTime, now, this.tracks))
      .filter((aircraft): aircraft is Aircraft => aircraft !== null);
  }

  private async fetchOpenSky(url: URL): Promise<Response> {
    let response = await fetchWithTimeout(
      url,
      this.config.flightProviderTimeoutMs,
      await this.tokenManager.authorizationHeader()
    );

    if (response.status === 401 && this.tokenManager.hasCredentials()) {
      this.tokenManager.invalidate();
      response = await fetchWithTimeout(
        url,
        this.config.flightProviderTimeoutMs,
        await this.tokenManager.authorizationHeader()
      );
    }

    return response;
  }
}

function normaliseOpenSkyState(
  state: unknown[],
  responseTime: string,
  now: Date,
  tracks: AircraftTrackState
): Aircraft | null {
  const icao24 = cleanOptionalString(state[0])?.toLowerCase();
  const longitude = boundedLongitude(state[5]);
  const latitude = boundedLatitude(state[6]);
  if (!icao24 || longitude === undefined || latitude === undefined) {
    return null;
  }

  const callsign = cleanOptionalString(state[1]);
  const originCountry = cleanOptionalString(state[2]);
  const squawk = cleanOptionalString(state[14]);
  const categoryValue = finiteNumber(state[17]);
  const emergency = isEmergencySquawk(squawk) || state[15] === true;
  const identity = {
    ...(callsign ? { callsign } : {}),
    ...(categoryValue === undefined ? {} : { category: `OpenSky category ${categoryValue}` }),
    emergency
  };
  const classification = classifyAndRisk(identity);
  const lastUpdated = timestampFromSeconds(state[4], now) ?? responseTime;
  const aircraftBase: Omit<Aircraft, "track"> = {
    id: `icao24-${icao24}`,
    icao24,
    ...(callsign ? { callsign } : {}),
    ...(originCountry ? { originCountry } : {}),
    longitude,
    latitude,
    ...(metresAltitudeToFeet(state[7]) !== undefined
      ? { altitudeFt: metresAltitudeToFeet(state[7]) }
      : {}),
    ...(metresAltitudeToFeet(state[13]) !== undefined
      ? { geoAltitudeFt: metresAltitudeToFeet(state[13]) }
      : {}),
    ...(metresPerSecondToKt(state[9]) !== undefined
      ? { groundSpeedKt: metresPerSecondToKt(state[9]) }
      : {}),
    ...(normaliseHeading(state[10]) !== undefined ? { trackDegrees: normaliseHeading(state[10]) } : {}),
    ...(metresPerSecondToFpm(state[11]) !== undefined
      ? { verticalRateFpm: metresPerSecondToFpm(state[11]) }
      : {}),
    ...(squawk ? { squawk } : {}),
    emergency,
    onGround: state[8] === true,
    ...(identity.category ? { category: identity.category } : {}),
    classification: classification.classification,
    riskLevel: classification.riskLevel,
    source: "opensky",
    lastUpdated
  };

  return {
    ...aircraftBase,
    track: buildAircraftTrack(aircraftBase, tracks)
  };
}

class OpenSkyTokenManager {
  private token: string | undefined;
  private expiresAtMs = 0;
  private pendingToken: Promise<string | undefined> | undefined;

  constructor(private readonly config: AppConfig) {}

  hasCredentials(): boolean {
    return Boolean(this.config.openSkyClientId && this.config.openSkyClientSecret);
  }

  invalidate(): void {
    this.token = undefined;
    this.expiresAtMs = 0;
    this.pendingToken = undefined;
  }

  async authorizationHeader(): Promise<string | undefined> {
    if (!this.hasCredentials()) {
      return undefined;
    }

    const token = await this.getToken();
    return token ? `Bearer ${token}` : undefined;
  }

  private async getToken(): Promise<string | undefined> {
    if (this.token && Date.now() + tokenRefreshMarginMs < this.expiresAtMs) {
      return this.token;
    }

    this.pendingToken ??= this.refreshToken().finally(() => {
      this.pendingToken = undefined;
    });

    return this.pendingToken;
  }

  private async refreshToken(): Promise<string | undefined> {
    const clientId = this.config.openSkyClientId;
    const clientSecret = this.config.openSkyClientSecret;
    if (!clientId || !clientSecret) {
      return undefined;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    });
    const response = await fetchWithTimeout(new URL(defaultOpenSkyTokenUrl), this.config.flightProviderTimeoutMs, undefined, {
      method: "POST",
      body,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      }
    });

    if (!response.ok) {
      throw new Error(`OpenSky OAuth token request failed HTTP ${response.status}`);
    }

    const payload = openSkyTokenSchema.parse(await response.json());
    this.token = payload.access_token;
    this.expiresAtMs = Date.now() + Math.max(1, payload.expires_in ?? 1800) * 1000;

    return this.token;
  }
}

class OpenSkyRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`OpenSky rate limit exhausted; retrying after ${Math.ceil(retryAfterMs / 1000)} seconds.`);
  }

  static fromResponse(response: Response): OpenSkyRateLimitError {
    return new OpenSkyRateLimitError(retryAfterMs(response));
  }
}

async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
  authorizationHeader?: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init?.headers ?? { accept: "application/json" });
  if (authorizationHeader) {
    headers.set("authorization", authorizationHeader);
  }

  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function retryAfterMs(response: Response): number {
  const value =
    response.headers.get("x-rate-limit-retry-after-seconds") ??
    response.headers.get("retry-after");
  if (!value) {
    return defaultRetryAfterMs;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const retryAt = new Date(value).getTime();
  if (!Number.isNaN(retryAt)) {
    return Math.max(defaultRetryAfterMs, retryAt - Date.now());
  }

  return defaultRetryAfterMs;
}

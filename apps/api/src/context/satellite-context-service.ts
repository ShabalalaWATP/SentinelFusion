import type { SatelliteContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { ISatelliteContextService } from "../domain/interfaces";
import { satelliteContextAreaLimitError } from "./satellite-context-limits";
import {
  liveNasaGibsSatelliteContext,
  mockSatelliteContext,
  notConfiguredSatelliteContext,
  providerErrorSatelliteContext
} from "./satellite-context-response";

export class SatelliteContextService implements ISatelliteContextService {
  constructor(
    private readonly config: AppConfig,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaSnapshot(bounds: TrafficAreaBounds): Promise<SatelliteContextResponse> {
    const generatedAt = this.now().toISOString();
    const limitError = satelliteContextAreaLimitError(bounds);
    if (limitError) {
      return providerErrorSatelliteContext(
        bounds,
        generatedAt,
        this.config.satelliteContextMode,
        this.config.satelliteContextProvider,
        limitError
      );
    }

    if (this.config.satelliteContextMode === "off") {
      return notConfiguredSatelliteContext(
        bounds,
        generatedAt,
        this.config.satelliteContextMode,
        this.config.satelliteContextProvider
      );
    }

    if (this.config.satelliteContextMode === "mock") {
      return mockSatelliteContext(bounds, generatedAt, this.config.satelliteContextImageSize);
    }

    if (this.config.satelliteContextProvider !== "nasa-gibs") {
      return notConfiguredSatelliteContext(
        bounds,
        generatedAt,
        this.config.satelliteContextMode,
        this.config.satelliteContextProvider
      );
    }

    return liveNasaGibsSatelliteContext(bounds, generatedAt, this.config);
  }
}

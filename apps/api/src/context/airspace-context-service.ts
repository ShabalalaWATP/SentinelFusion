import type { AirspaceContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IAirspaceContextService } from "../domain/interfaces";
import { airspaceContextAreaLimitError } from "./airspace-context-limits";
import {
  mockAirspaceContext,
  notConfiguredAirspaceContext,
  providerErrorAirspaceContext
} from "./airspace-context-response";

export class AirspaceContextService implements IAirspaceContextService {
  constructor(
    private readonly config: AppConfig,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getAreaAirspace(bounds: TrafficAreaBounds): Promise<AirspaceContextResponse> {
    const generatedAt = this.now().toISOString();
    const limitError = airspaceContextAreaLimitError(bounds);
    if (limitError) {
      return providerErrorAirspaceContext(
        generatedAt,
        this.config.airspaceContextMode,
        bounds,
        limitError
      );
    }

    if (this.config.airspaceContextMode === "mock") {
      return mockAirspaceContext(generatedAt, bounds, this.config.airspaceContextMaxResults);
    }

    return notConfiguredAirspaceContext(
      generatedAt,
      this.config.airspaceContextMode,
      bounds
    );
  }
}

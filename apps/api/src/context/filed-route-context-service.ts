import type { Aircraft, FiledRouteContextResponse } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { IFlightRouteContextService } from "../domain/interfaces";
import {
  mockFiledRouteContext,
  notConfiguredFiledRouteContext
} from "./filed-route-context-response";

export class FiledRouteContextService implements IFlightRouteContextService {
  constructor(
    private readonly config: AppConfig,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getFiledRoute(aircraft: Aircraft): Promise<FiledRouteContextResponse> {
    const generatedAt = this.now().toISOString();

    if (this.config.flightRouteContextMode === "mock") {
      return mockFiledRouteContext(
        generatedAt,
        aircraft,
        this.config.flightRouteContextMaxWaypoints
      );
    }

    return notConfiguredFiledRouteContext(
      generatedAt,
      this.config.flightRouteContextMode,
      this.config.flightRouteContextProvider,
      aircraft
    );
  }
}

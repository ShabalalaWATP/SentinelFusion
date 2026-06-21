import type { SanctionsScreeningResponse, Vessel } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";
import type { ISanctionsScreeningService } from "../domain/interfaces";
import {
  mockSanctionsScreening,
  notConfiguredSanctionsScreening
} from "./sanctions-screening-response";

export class SanctionsScreeningService implements ISanctionsScreeningService {
  constructor(
    private readonly config: AppConfig,
    private readonly now: () => Date = () => new Date()
  ) {}

  async screenVessel(vessel: Vessel): Promise<SanctionsScreeningResponse> {
    const generatedAt = this.now().toISOString();

    if (this.config.sanctionsContextMode === "mock") {
      return mockSanctionsScreening(
        generatedAt,
        vessel,
        this.config.sanctionsContextMaxResults
      );
    }

    return notConfiguredSanctionsScreening(
      generatedAt,
      this.config.sanctionsContextMode,
      this.config.sanctionsContextProvider,
      vessel
    );
  }
}

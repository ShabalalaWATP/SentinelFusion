import type { AnalysisSummary } from "@aisstream/shared";
import { analysisSummarySchema } from "@aisstream/shared";
import type { AnalysisContext, IAnalysisAgentService } from "../domain/interfaces";

export class DeferredAnalysisAgentService implements IAnalysisAgentService {
  async analyse(context: AnalysisContext): Promise<AnalysisSummary> {
    return analysisSummarySchema.parse({
      status: "not_configured",
      mode: "mock",
      summary: "Analysis is not configured for this API instance.",
      riskLevel: context.selectedVessel?.riskLevel ?? "low",
      keyFindings: ["No analysis provider is active."],
      recommendedActions: ["Enable mock or live analysis in the API configuration."],
      evidence: [
        `Server context contained ${context.vessels.length} vessels and ${context.aircraft.length} aircraft.`
      ],
      limitations: ["This deferred service is only a safe fallback."],
      generatedAt: new Date().toISOString()
    });
  }
}

export type AnalysisMode = "area" | "vessel";

const areaDefaultQuestion = "How many vessels are in the Portsmouth area?";
const vesselDefaultQuestion = "Assess this vessel and nearby traffic.";

export function questionForAnalysisMode(mode: AnalysisMode): string {
  return mode === "vessel" ? vesselDefaultQuestion : areaDefaultQuestion;
}

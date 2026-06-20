import type { AnalysisAreaResult } from "@aisstream/shared";
import { FireContextPanel } from "./FireContextPanel";
import { MarineWeatherPanel } from "./MarineWeatherPanel";

type AreaContextStackProps = {
  area: AnalysisAreaResult;
};

export function AreaContextStack({ area }: AreaContextStackProps) {
  return (
    <div className="space-y-3">
      <MarineWeatherPanel area={area} />
      <FireContextPanel area={area} />
    </div>
  );
}

import type { AnalysisAreaResult } from "@aisstream/shared";
import { AirspaceContextPanel } from "./AirspaceContextPanel";
import { AirportContextPanel } from "./AirportContextPanel";
import { FireContextPanel } from "./FireContextPanel";
import { MarineWeatherPanel } from "./MarineWeatherPanel";

type AreaContextStackProps = {
  area: AnalysisAreaResult;
};

export function AreaContextStack({ area }: AreaContextStackProps) {
  return (
    <div className="space-y-3">
      <AirportContextPanel area={area} />
      <AirspaceContextPanel area={area} />
      <MarineWeatherPanel area={area} />
      <FireContextPanel area={area} />
    </div>
  );
}

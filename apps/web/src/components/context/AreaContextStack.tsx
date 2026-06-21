import type { AnalysisAreaResult } from "@aisstream/shared";
import { AirportContextPanel } from "./AirportContextPanel";
import { ConflictContextPanel } from "./ConflictContextPanel";
import { FireContextPanel } from "./FireContextPanel";
import { MarineWeatherPanel } from "./MarineWeatherPanel";
import { SatelliteContextPanel } from "./SatelliteContextPanel";

type AreaContextStackProps = {
  area: AnalysisAreaResult;
};

export function AreaContextStack({ area }: AreaContextStackProps) {
  return (
    <div className="space-y-3">
      <AirportContextPanel area={area} />
      <ConflictContextPanel area={area} />
      <SatelliteContextPanel area={area} />
      <MarineWeatherPanel area={area} />
      <FireContextPanel area={area} />
    </div>
  );
}

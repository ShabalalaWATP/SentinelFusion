import { useMemo } from "react";
import type { AirportContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useAirportContextStore } from "../../stores/airportContextStore";
import { useAnalysisStore } from "../../stores/analysisStore";
import {
  emptyAirportContextCollection,
  toAirportContextCollection
} from "./airportContextOverlay";

export function useAirportContextData() {
  const area = useAnalysisStore((state) => state.result?.area ?? null);
  const selectedAircraftId = useAircraftStore((state) => state.selectedAircraftId);
  const areaResult = useAirportContextStore((state) => state.areaResult);
  const aircraftResult = useAirportContextStore((state) =>
    selectedAircraftId ? state.aircraftResults[selectedAircraftId] ?? null : null
  );

  return useMemo(() => {
    const visibleAircraftResult = matchingAircraftResult(aircraftResult, selectedAircraftId);
    if (visibleAircraftResult) {
      return toAirportContextCollection(visibleAircraftResult);
    }

    if (area && areaResult?.area && boundsMatch(area.bounds, areaResult.area)) {
      return toAirportContextCollection(areaResult);
    }

    return emptyAirportContextCollection();
  }, [aircraftResult, area, areaResult, selectedAircraftId]);
}

function matchingAircraftResult(
  result: AirportContextResponse | null,
  selectedAircraftId: string | null
): AirportContextResponse | null {
  if (!selectedAircraftId || !result?.focus?.aircraftId) {
    return null;
  }

  return result.focus.aircraftId === selectedAircraftId ? result : null;
}

function boundsMatch(left: TrafficAreaBounds, right: TrafficAreaBounds): boolean {
  return (
    left.south === right.south &&
    left.west === right.west &&
    left.north === right.north &&
    left.east === right.east
  );
}

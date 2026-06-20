import { useMemo } from "react";
import type { TrafficAreaBounds } from "@aisstream/shared";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useFireContextStore } from "../../stores/fireContextStore";
import {
  emptyFireAnomalyCollection,
  toFireAnomalyCollection
} from "./fireAnomalyOverlay";

export function useFireAnomalyData() {
  const area = useAnalysisStore((state) => state.result?.area ?? null);
  const fireContextResult = useFireContextStore((state) => state.result);

  return useMemo(() => {
    if (!area || !fireContextResult?.area || !boundsMatch(area.bounds, fireContextResult.area)) {
      return emptyFireAnomalyCollection();
    }

    return toFireAnomalyCollection(fireContextResult);
  }, [area, fireContextResult]);
}

function boundsMatch(left: TrafficAreaBounds, right: TrafficAreaBounds): boolean {
  return (
    left.south === right.south &&
    left.west === right.west &&
    left.north === right.north &&
    left.east === right.east
  );
}

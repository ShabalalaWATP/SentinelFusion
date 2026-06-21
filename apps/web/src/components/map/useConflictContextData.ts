import { useMemo } from "react";
import type { TrafficAreaBounds } from "@aisstream/shared";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useConflictContextStore } from "../../stores/conflictContextStore";
import {
  emptyConflictContextCollection,
  toConflictContextCollection
} from "./conflictContextOverlay";

export function useConflictContextData() {
  const area = useAnalysisStore((state) => state.result?.area ?? null);
  const conflictContextResult = useConflictContextStore((state) => state.result);

  return useMemo(() => {
    if (!area || !conflictContextResult?.area || !boundsMatch(area.bounds, conflictContextResult.area)) {
      return emptyConflictContextCollection();
    }

    return toConflictContextCollection(conflictContextResult);
  }, [area, conflictContextResult]);
}

function boundsMatch(left: TrafficAreaBounds, right: TrafficAreaBounds): boolean {
  return (
    left.south === right.south &&
    left.west === right.west &&
    left.north === right.north &&
    left.east === right.east
  );
}

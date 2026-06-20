import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectAircraftFilters, useAircraftFilterStore } from "../stores/aircraftFilterStore";
import { selectAircraftList, useAircraftStore } from "../stores/aircraftStore";
import { useMapStore } from "../stores/mapStore";
import { useTrafficRuleStore } from "../stores/trafficRuleStore";
import { selectVesselList, useVesselStore } from "../stores/vesselStore";
import { selectVisibleTraffic } from "../traffic/trafficFilters";

export function useVisibleTraffic() {
  const vessels = useVesselStore(useShallow(selectVesselList));
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const aircraftFilters = useAircraftFilterStore(selectAircraftFilters);
  const selectedAircraftId = useAircraftStore((state) => state.selectedAircraftId);
  const domainFilter = useMapStore((state) => state.domainFilter);
  const areaSelection = useMapStore((state) => state.areaSelection);
  const areaOnlyMode = useMapStore((state) => state.areaOnlyMode);
  const rules = useTrafficRuleStore((state) => state.rules);
  const activeRules = useMemo(() => rules.filter((rule) => rule.active), [rules]);
  const activeAreaOnlyRule = activeRules.find((rule) => rule.areaOnly) ?? null;
  const areaOnlyBounds =
    activeAreaOnlyRule?.area.bounds ?? (areaOnlyMode ? areaSelection?.bounds ?? null : null);
  const visibleTraffic = useMemo(
    () =>
      selectVisibleTraffic(vessels, aircraft, {
        activeAreaOnlyRule,
        aircraftFilters,
        areaOnlyBounds,
        domainFilter,
        selectedAircraftId
      }),
    [
      activeAreaOnlyRule,
      aircraft,
      aircraftFilters,
      areaOnlyBounds,
      domainFilter,
      selectedAircraftId,
      vessels
    ]
  );

  return {
    activeRules,
    aircraft,
    vessels,
    visibleAircraft: visibleTraffic.aircraft,
    visibleVessels: visibleTraffic.vessels
  };
}

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectAircraftFilters, useAircraftFilterStore } from "../stores/aircraftFilterStore";
import { selectAircraftList, useAircraftStore } from "../stores/aircraftStore";
import { selectFeedConfidenceSettings, useFeedFilterStore } from "../stores/feedFilterStore";
import { useMapStore } from "../stores/mapStore";
import { useTrafficRuleStore } from "../stores/trafficRuleStore";
import { selectVesselList, useVesselStore } from "../stores/vesselStore";
import { isFeedHealthy } from "../traffic/feedConfidence";
import { selectVisibleTraffic } from "../traffic/trafficFilters";
import { useNowTick } from "./useNowTick";

export function useVisibleTraffic() {
  const vessels = useVesselStore(useShallow(selectVesselList));
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const aircraftFilters = useAircraftFilterStore(selectAircraftFilters);
  const feedConfidenceSettings = useFeedFilterStore(selectFeedConfidenceSettings);
  const selectedAircraftId = useAircraftStore((state) => state.selectedAircraftId);
  const selectedVesselId = useVesselStore((state) => state.selectedVesselId);
  const vesselStreamStatus = useVesselStore((state) => state.streamStatus);
  const vesselConnectionStatus = useVesselStore((state) => state.connectionStatus);
  const vesselLastError = useVesselStore((state) => state.lastError);
  const aircraftStreamStatus = useAircraftStore((state) => state.streamStatus);
  const aircraftConnectionStatus = useAircraftStore((state) => state.connectionStatus);
  const aircraftLastError = useAircraftStore((state) => state.lastError);
  const nowMs = useNowTick(
    feedConfidenceSettings.hideStaleContacts || feedConfidenceSettings.hideUnhealthyFeeds
  );
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
        feedConfidenceSettings,
        feedHealth: {
          aircraftHealthy: isFeedHealthy({
            connectionStatus: aircraftConnectionStatus,
            lastError: aircraftLastError,
            maxMessageAgeMinutes: feedConfidenceSettings.maxContactAgeMinutes,
            nowMs,
            streamStatus: aircraftStreamStatus
          }),
          nowMs,
          vesselsHealthy: isFeedHealthy({
            connectionStatus: vesselConnectionStatus,
            lastError: vesselLastError,
            maxMessageAgeMinutes: feedConfidenceSettings.maxContactAgeMinutes,
            nowMs,
            streamStatus: vesselStreamStatus
          })
        },
        selectedAircraftId,
        selectedVesselId
      }),
    [
      activeAreaOnlyRule,
      aircraft,
      aircraftFilters,
      aircraftConnectionStatus,
      aircraftLastError,
      aircraftStreamStatus,
      areaOnlyBounds,
      domainFilter,
      feedConfidenceSettings,
      nowMs,
      selectedAircraftId,
      selectedVesselId,
      vesselConnectionStatus,
      vesselLastError,
      vesselStreamStatus,
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

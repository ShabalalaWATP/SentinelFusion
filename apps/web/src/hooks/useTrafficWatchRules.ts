import { useEffect, useMemo, useRef } from "react";
import { isCoordinateInsideBounds } from "@aisstream/shared";
import { useShallow } from "zustand/react/shallow";
import { selectAircraftList, useAircraftStore } from "../stores/aircraftStore";
import {
  type TrafficRuleEvent,
  useTrafficRuleStore
} from "../stores/trafficRuleStore";
import { selectVesselList, useVesselStore } from "../stores/vesselStore";
import { isDomainIncluded } from "../traffic/trafficFilters";

type RuleMembership = Record<string, Set<string>>;

export function useTrafficWatchRules(): void {
  const vessels = useVesselStore(useShallow(selectVesselList));
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const rules = useTrafficRuleStore((state) => state.rules);
  const activeRules = useMemo(() => rules.filter((rule) => rule.active), [rules]);
  const recordEvents = useTrafficRuleStore((state) => state.recordEvents);
  const previousMembershipRef = useRef<RuleMembership>({});

  useEffect(() => {
    const nextMembership: RuleMembership = {};
    const events: TrafficRuleEvent[] = [];
    const now = new Date().toISOString();

    for (const rule of activeRules) {
      const currentIds = new Set<string>();

      if (isDomainIncluded("vessel", rule.domain)) {
        vessels
          .filter((vessel) => isCoordinateInsideBounds(vessel, rule.area.bounds))
          .forEach((vessel) => {
            const key = `vessel:${vessel.id}`;
            currentIds.add(key);
            appendMembershipEvent(events, previousMembershipRef.current[rule.id], {
              entityDomain: "vessel",
              entityId: vessel.id,
              entityLabel: vessel.name,
              eventKey: key,
              eventType: "entered",
              occurredAt: now,
              ruleId: rule.id,
              ruleLabel: rule.label
            });
          });
      }

      if (isDomainIncluded("aircraft", rule.domain)) {
        aircraft
          .filter((item) => isCoordinateInsideBounds(item, rule.area.bounds))
          .forEach((item) => {
            const key = `aircraft:${item.id}`;
            currentIds.add(key);
            appendMembershipEvent(events, previousMembershipRef.current[rule.id], {
              entityDomain: "aircraft",
              entityId: item.id,
              entityLabel: item.callsign ?? item.registration ?? item.icao24.toUpperCase(),
              eventKey: key,
              eventType: "entered",
              occurredAt: now,
              ruleId: rule.id,
              ruleLabel: rule.label
            });
          });
      }

      for (const previousKey of previousMembershipRef.current[rule.id] ?? []) {
        if (!currentIds.has(previousKey)) {
          const [entityDomain, entityId] = previousKey.split(":");
          if (!entityDomain || !entityId) {
            continue;
          }

          events.push({
            id: `${rule.id}-${previousKey}-left-${Date.now()}`,
            ruleId: rule.id,
            ruleLabel: rule.label,
            entityId,
            entityLabel: entityId,
            entityDomain: entityDomain === "aircraft" ? "aircraft" : "vessel",
            eventType: "left",
            occurredAt: now
          });
        }
      }

      nextMembership[rule.id] = currentIds;
    }

    const knownRules = new Set(activeRules.map((rule) => rule.id));
    previousMembershipRef.current = Object.fromEntries(
      Object.entries(nextMembership).filter(([ruleId]) => knownRules.has(ruleId))
    );

    if (events.length > 0) {
      recordEvents(events.slice(0, 20));
    }
  }, [activeRules, aircraft, recordEvents, vessels]);
}

function appendMembershipEvent(
  events: TrafficRuleEvent[],
  previousIds: Set<string> | undefined,
  event: Omit<TrafficRuleEvent, "id"> & { eventKey: string }
): void {
  if (!previousIds || previousIds.has(event.eventKey)) {
    return;
  }

  events.push({
    id: `${event.ruleId}-${event.eventKey}-${event.eventType}-${Date.now()}`,
    ruleId: event.ruleId,
    ruleLabel: event.ruleLabel,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    entityDomain: event.entityDomain,
    eventType: event.eventType,
    occurredAt: event.occurredAt
  });
}

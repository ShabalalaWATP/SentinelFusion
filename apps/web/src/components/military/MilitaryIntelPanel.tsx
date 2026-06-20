import {
  classifyVessel,
  isClassifiedVessel,
  type Aircraft,
  type RiskLevel,
  type Vessel
} from "@aisstream/shared";
import { Crosshair, Plane, Search, Shield } from "lucide-react";
import { selectAircraftFilters, useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { useAircraftIntelStore } from "../../stores/aircraftIntelStore";
import { useVesselIntelStore } from "../../stores/vesselIntelStore";
import { filterAircraftBySettings } from "../../traffic/trafficFilters";
import { AircraftBadges } from "../aircraft/AircraftBadges";
import { VesselBadges } from "../vessels/VesselBadges";

type MilitaryIntelPanelProps = {
  aircraft: Aircraft[];
  onInspectAircraft(aircraft: Aircraft): void;
  vessels: Vessel[];
  onInspectVessel(vessel: Vessel): void;
};

export function MilitaryIntelPanel({
  aircraft,
  onInspectAircraft,
  vessels,
  onInspectVessel
}: MilitaryIntelPanelProps) {
  const results = useVesselIntelStore((state) => state.results);
  const statuses = useVesselIntelStore((state) => state.statuses);
  const research = useVesselIntelStore((state) => state.research);
  const aircraftFilters = useAircraftFilterStore(selectAircraftFilters);
  const aircraftResults = useAircraftIntelStore((state) => state.results);
  const aircraftStatuses = useAircraftIntelStore((state) => state.statuses);
  const researchAircraft = useAircraftIntelStore((state) => state.research);
  const classifiedVessels = vessels
    .filter(isClassifiedVessel)
    .sort(compareClassifiedVessels);
  const classifiedAircraft = filterAircraftBySettings(aircraft, aircraftFilters)
    .filter(isClassifiedAircraft)
    .sort(compareClassifiedAircraft);
  const vesselMilitaryCount = classifiedVessels.filter(
    (vessel) => classifyVessel(vessel) === "military"
  ).length;
  const militaryCount =
    vesselMilitaryCount + classifiedAircraft.filter((item) => item.classification === "military").length;
  const governmentCount =
    classifiedVessels.length - vesselMilitaryCount +
    classifiedAircraft.filter((item) => item.classification === "government").length;
  const enrichedCount =
    classifiedVessels.filter((vessel) => results[vessel.id]).length +
    classifiedAircraft.filter((item) => aircraftResults[item.id]).length;
  const searchingCount = classifiedVessels.filter(
    (vessel) => statuses[vessel.id] === "loading"
  ).length + classifiedAircraft.filter((item) => aircraftStatuses[item.id] === "loading").length;
  const hasClassifiedContacts = classifiedAircraft.length > 0 || classifiedVessels.length > 0;

  return (
    <aside className="flex h-[18rem] w-full shrink-0 flex-col border-t border-slate-500/[0.15] bg-ocean-900/[0.96] shadow-panel lg:h-full lg:w-[22rem] lg:border-l lg:border-t-0">
      <div className="border-b border-slate-500/[0.15] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
          Military intel
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-7 text-slate-50">
          Sea and air contacts
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-2">
          <SummaryTile label="Military" value={militaryCount} />
          <SummaryTile label="Government" value={governmentCount} />
          <SummaryTile label="Enriched" value={enrichedCount} />
          <SummaryTile label="Searching" value={searchingCount} />
        </div>

        <div className="mt-4 space-y-2">
          {classifiedAircraft.length > 0 ? (
            <>
              <SectionTitle label="Aircraft" count={classifiedAircraft.length} />
              {classifiedAircraft.map((item) => (
                <ClassifiedAircraftRow
                  key={item.id}
                  aircraft={item}
                  status={aircraftStatuses[item.id] ?? "idle"}
                  hasIntel={Boolean(aircraftResults[item.id])}
                  onInspect={() => onInspectAircraft(item)}
                  onResearch={() => void researchAircraft(item.id)}
                />
              ))}
            </>
          ) : null}

          {classifiedVessels.length > 0 ? (
            <>
              <SectionTitle label="Vessels" count={classifiedVessels.length} />
              {classifiedVessels.map((vessel) => (
              <ClassifiedVesselRow
                key={vessel.id}
                vessel={vessel}
                status={statuses[vessel.id] ?? "idle"}
                hasIntel={Boolean(results[vessel.id])}
                onInspect={() => onInspectVessel(vessel)}
                onResearch={() => void research(vessel.id)}
              />
              ))}
            </>
          ) : null}

          {!hasClassifiedContacts ? (
            <p className="text-sm leading-6 text-slate-400">
              No military or government sea or air contacts are currently identified.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <span className="text-xs text-slate-500">{count.toLocaleString("en-GB")}</span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.30] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-50">
        {new Intl.NumberFormat("en-GB").format(value)}
      </p>
    </div>
  );
}

function ClassifiedAircraftRow({
  aircraft,
  status,
  hasIntel,
  onInspect,
  onResearch
}: {
  aircraft: Aircraft;
  status: string;
  hasIntel: boolean;
  onInspect(): void;
  onResearch(): void;
}) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.30] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onInspect}
          className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Plane
              size={15}
              className={aircraft.classification === "military" ? "text-violet-200" : "text-cyan-100"}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-medium text-slate-100">
              {aircraftLabel(aircraft)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            {aircraft.icao24.toUpperCase()} · {aircraft.operator ?? aircraft.aircraftType ?? aircraft.originCountry ?? "Unknown operator"}
          </p>
        </button>
        <AircraftBadges aircraft={aircraft} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-500">
          {hasIntel ? "Web intel ready" : status === "loading" ? "Searching public sources" : "Queued for web intel"}
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onInspect}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-900 text-cyan-100 transition hover:border-cyan-300/[0.45]"
            aria-label={`Focus ${aircraftLabel(aircraft)} on map`}
            title="Focus on map"
          >
            <Crosshair size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onResearch}
            disabled={status === "loading"}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-900 text-cyan-100 transition hover:border-cyan-300/[0.45] disabled:cursor-not-allowed disabled:text-slate-600"
            aria-label={`Research ${aircraftLabel(aircraft)}`}
            title="Research aircraft"
          >
            <Search size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ClassifiedVesselRow({
  vessel,
  status,
  hasIntel,
  onInspect,
  onResearch
}: {
  vessel: Vessel;
  status: string;
  hasIntel: boolean;
  onInspect(): void;
  onResearch(): void;
}) {
  const classification = classifyVessel(vessel);

  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.30] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onInspect}
          className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Shield
              size={15}
              className={classification === "military" ? "text-violet-200" : "text-cyan-100"}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-medium text-slate-100">
              {vessel.name}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            {vessel.mmsi} · {vessel.shipType}
          </p>
        </button>
        <VesselBadges vessel={vessel} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-500">
          {hasIntel ? "Web intel ready" : status === "loading" ? "Searching public sources" : "Queued for web intel"}
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onInspect}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-900 text-cyan-100 transition hover:border-cyan-300/[0.45]"
            aria-label={`Focus ${vessel.name} on map`}
            title="Focus on map"
          >
            <Crosshair size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onResearch}
            disabled={status === "loading"}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-900 text-cyan-100 transition hover:border-cyan-300/[0.45] disabled:cursor-not-allowed disabled:text-slate-600"
            aria-label={`Research ${vessel.name}`}
            title="Research vessel"
          >
            <Search size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function compareClassifiedVessels(left: Vessel, right: Vessel): number {
  const leftClass = classifyVessel(left);
  const rightClass = classifyVessel(right);
  if (leftClass !== rightClass) {
    return leftClass === "military" ? -1 : 1;
  }

  if (left.riskLevel !== right.riskLevel) {
    return riskRank(right.riskLevel) - riskRank(left.riskLevel);
  }

  return left.name.localeCompare(right.name);
}

function compareClassifiedAircraft(left: Aircraft, right: Aircraft): number {
  if (left.classification !== right.classification) {
    return left.classification === "military" ? -1 : 1;
  }

  if (left.riskLevel !== right.riskLevel) {
    return riskRank(right.riskLevel) - riskRank(left.riskLevel);
  }

  return aircraftLabel(left).localeCompare(aircraftLabel(right));
}

function isClassifiedAircraft(aircraft: Aircraft): boolean {
  return aircraft.classification === "military" || aircraft.classification === "government";
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
}

function riskRank(risk: RiskLevel): number {
  return risk === "high" ? 3 : risk === "medium" ? 2 : 1;
}

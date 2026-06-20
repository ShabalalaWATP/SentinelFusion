import { BarChart3, MapPinned } from "lucide-react";
import { useMemo, useState } from "react";
import { trafficAreaRegistry } from "@aisstream/shared";
import { useShallow } from "zustand/react/shallow";
import { selectAircraftList, useAircraftStore } from "../../stores/aircraftStore";
import { useMapStore } from "../../stores/mapStore";
import { selectVesselList, useVesselStore } from "../../stores/vesselStore";
import { summariseAreaTraffic } from "../../traffic/trafficFilters";

export function AreaComparePanel() {
  const [leftId, setLeftId] = useState("portsmouth");
  const [rightId, setRightId] = useState("hormuz");
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const vessels = useVesselStore(useShallow(selectVesselList));
  const selectOperationalArea = useMapStore((state) => state.selectOperationalArea);
  const leftArea = trafficAreaRegistry.find((area) => area.id === leftId) ?? trafficAreaRegistry[0];
  const rightArea = trafficAreaRegistry.find((area) => area.id === rightId) ?? trafficAreaRegistry[1];
  const leftSummary = useMemo(
    () => summariseAreaTraffic(vessels, aircraft, leftArea?.bounds ?? null),
    [aircraft, leftArea, vessels]
  );
  const rightSummary = useMemo(
    () => summariseAreaTraffic(vessels, aircraft, rightArea?.bounds ?? null),
    [aircraft, rightArea, vessels]
  );

  if (!leftArea || !rightArea) {
    return null;
  }

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
        Compare areas
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <AreaSelect id="compare-left" value={leftId} onChange={setLeftId} />
        <AreaSelect id="compare-right" value={rightId} onChange={setRightId} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <CompareCard label={leftArea.name} vessels={leftSummary.vesselCount} aircraft={leftSummary.aircraftCount} highRisk={leftSummary.highRiskVessels} />
        <CompareCard label={rightArea.name} vessels={rightSummary.vesselCount} aircraft={rightSummary.aircraftCount} highRisk={rightSummary.highRiskVessels} />
      </div>
      <div className="mt-3 rounded-md bg-slate-950/[0.36] p-2 text-xs leading-5 text-slate-300">
        <BarChart3 size={14} className="mr-1 inline text-cyan-100" aria-hidden="true" />
        Vessel delta: {(leftSummary.vesselCount - rightSummary.vesselCount).toLocaleString("en-GB")};
        aircraft delta: {(leftSummary.aircraftCount - rightSummary.aircraftCount).toLocaleString("en-GB")}.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[leftArea, rightArea].map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => selectOperationalArea(area)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/[0.28] px-2 text-xs text-cyan-50 transition hover:bg-cyan-300/[0.10]"
          >
            <MapPinned size={13} aria-hidden="true" />
            Focus {area.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function AreaSelect({
  id,
  onChange,
  value
}: {
  id: string;
  onChange(value: string): void;
  value: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-0 rounded-md border border-slate-500/[0.20] bg-slate-950 px-2 text-xs text-slate-50 outline-none focus:border-cyan-300/[0.70] focus:ring-2 focus:ring-cyan-300/[0.22]"
      aria-label={id === "compare-left" ? "First comparison area" : "Second comparison area"}
    >
      {trafficAreaRegistry.map((area) => (
        <option key={area.id} value={area.id}>
          {area.name}
        </option>
      ))}
    </select>
  );
}

function CompareCard({
  aircraft,
  highRisk,
  label,
  vessels
}: {
  aircraft: number;
  highRisk: number;
  label: string;
  vessels: number;
}) {
  return (
    <div className="rounded-md border border-slate-500/[0.14] bg-slate-950/[0.34] p-2">
      <p className="truncate text-xs font-medium text-slate-100">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400">
        {vessels.toLocaleString("en-GB")} vessels · {aircraft.toLocaleString("en-GB")} aircraft
      </p>
      <p className="mt-1 text-[11px] text-amber-100">{highRisk.toLocaleString("en-GB")} high-risk ships</p>
    </div>
  );
}

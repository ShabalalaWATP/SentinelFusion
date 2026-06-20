import { MapPin, Plane, Ship } from "lucide-react";
import { useEffect } from "react";
import type { AnalysisAreaResult, AnalysisSummary, RiskLevel } from "@aisstream/shared";
import { useMapStore } from "../../stores/mapStore";
import { AreaContextStack } from "../context/AreaContextStack";
import { RiskDot } from "../vessels/VesselBadges";

type AnalysisResultProps = {
  result: AnalysisSummary;
  onInspectAircraft?: ((id: string) => void) | undefined;
  onInspectVessel?: ((id: string) => void) | undefined;
};

export function AnalysisResult({ result, onInspectAircraft, onInspectVessel }: AnalysisResultProps) {
  const focusArea = useMapStore((state) => state.focusArea);

  useEffect(() => {
    if (result.area) {
      focusArea(result.area);
    }
  }, [focusArea, result.area]);

  return result.area ? (
    <AreaAnalysisResult
      area={result.area}
      riskLevel={result.riskLevel}
      findings={result.keyFindings}
      actions={result.recommendedActions}
      onInspectAircraft={onInspectAircraft}
      onInspectVessel={onInspectVessel}
    />
  ) : (
    <GenericAnalysisResult result={result} />
  );
}

function AreaAnalysisResult({
  actions,
  area,
  findings,
  onInspectAircraft,
  onInspectVessel,
  riskLevel
}: {
  actions: string[];
  area: AnalysisAreaResult;
  findings: string[];
  onInspectAircraft: ((id: string) => void) | undefined;
  onInspectVessel: ((id: string) => void) | undefined;
  riskLevel: RiskLevel;
}) {
  return (
    <div className="mt-4 space-y-4 text-sm leading-5 text-slate-300">
      <div className="rounded-md border border-cyan-300/[0.20] bg-cyan-300/[0.08] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-normal text-cyan-200">
              Area result
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-6 text-slate-50">
              {area.name}
            </h3>
          </div>
          <RiskDot risk={riskLevel} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Vessels" value={area.count.toLocaleString("en-GB")} />
          <Metric label="High risk" value={area.highRiskCount.toLocaleString("en-GB")} />
          <Metric label="Military" value={area.militaryCount.toLocaleString("en-GB")} />
          <Metric label="Avg speed" value={`${area.averageSpeedKn.toFixed(1)} kn`} />
          <Metric label="Aircraft" value={area.aircraftCount.toLocaleString("en-GB")} />
          <Metric label="Military air" value={area.militaryAircraftCount.toLocaleString("en-GB")} />
          <Metric label="Emergency air" value={area.emergencyAircraftCount.toLocaleString("en-GB")} />
          <Metric label="Avg altitude" value={`${area.averageAircraftAltitudeFt.toLocaleString("en-GB")} ft`} />
        </div>
      </div>

      <AreaContextStack area={area} />
      <AreaVesselList area={area} onInspectVessel={onInspectVessel} />
      <AreaAircraftList area={area} onInspectAircraft={onInspectAircraft} />
      <AnalysisList title="Findings" items={findings.map(cleanAnalysisText)} />
      <AnalysisList title="Actions" items={actions.map(cleanAnalysisText)} />
    </div>
  );
}

function AreaVesselList({
  area,
  onInspectVessel
}: {
  area: AnalysisAreaResult;
  onInspectVessel: ((id: string) => void) | undefined;
}) {
  const isPartialList = area.listedCount < area.count;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
          Vessels in area
        </p>
        <span className="text-xs text-slate-500">
          {area.listedCount.toLocaleString("en-GB")}
          {isPartialList ? ` of ${area.count.toLocaleString("en-GB")}` : ""}
        </span>
      </div>
      {area.vessels.length === 0 ? (
        <p className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3 text-slate-400">
          No live vessels are currently inside this area.
        </p>
      ) : (
        <div className="space-y-2">
          {area.vessels.map((vessel) => (
            <button
              key={vessel.id}
              type="button"
              onClick={() => onInspectVessel?.(vessel.id)}
              className="w-full rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3 text-left transition hover:border-cyan-300/[0.38] focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-100">
                  {vessel.name}
                </span>
                <RiskPill riskLevel={vessel.riskLevel} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span className="truncate">{vessel.mmsi} · {vessel.shipType}</span>
                <span>{vessel.speedOverGround.toFixed(1)} kn</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Ship size={13} aria-hidden="true" />
                <span>{classificationLabel(vessel.classification)}</span>
                <MapPin size={13} aria-hidden="true" />
                <span>{vessel.latitude.toFixed(3)}, {vessel.longitude.toFixed(3)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AreaAircraftList({
  area,
  onInspectAircraft
}: {
  area: AnalysisAreaResult;
  onInspectAircraft: ((id: string) => void) | undefined;
}) {
  const isPartialList = area.listedAircraftCount < area.aircraftCount;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
          Aircraft in area
        </p>
        <span className="text-xs text-slate-500">
          {area.listedAircraftCount.toLocaleString("en-GB")}
          {isPartialList ? ` of ${area.aircraftCount.toLocaleString("en-GB")}` : ""}
        </span>
      </div>
      {area.aircraft.length === 0 ? (
        <p className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3 text-slate-400">
          No live aircraft are currently inside this area.
        </p>
      ) : (
        <div className="space-y-2">
          {area.aircraft.map((aircraft) => (
            <button
              key={aircraft.id}
              type="button"
              onClick={() => onInspectAircraft?.(aircraft.id)}
              className="w-full rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3 text-left transition hover:border-cyan-300/[0.38] focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-100">
                  {aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase()}
                </span>
                <RiskPill riskLevel={aircraft.riskLevel} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span className="truncate">
                  {aircraft.icao24.toUpperCase()} · {aircraft.aircraftType ?? aircraft.classification}
                </span>
                <span>{formatAircraftSpeed(aircraft.groundSpeedKt)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Plane size={13} aria-hidden="true" />
                <span>{aircraft.classification}</span>
                <MapPin size={13} aria-hidden="true" />
                <span>{aircraft.latitude.toFixed(3)}, {aircraft.longitude.toFixed(3)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GenericAnalysisResult({ result }: { result: AnalysisSummary }) {
  return (
    <div className="mt-4 space-y-3 text-sm leading-5 text-slate-300">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-slate-100">{cleanAnalysisText(result.summary)}</p>
        <RiskDot risk={result.riskLevel} />
      </div>
      <AnalysisList title="Findings" items={result.keyFindings.map(cleanAnalysisText)} />
      <AnalysisList title="Actions" items={result.recommendedActions.map(cleanAnalysisText)} />
      <AnalysisList title="Evidence" items={result.evidence.map(cleanAnalysisText)} />
      <AnalysisList title="Limitations" items={result.limitations.map(cleanAnalysisText)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.34] p-2">
      <p className="text-[10px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RiskPill({ riskLevel }: { riskLevel: RiskLevel }) {
  return (
    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
      {riskLevel}
    </span>
  );
}

function classificationLabel(value: string): string {
  if (value === "military") {
    return "Military";
  }

  if (value === "government") {
    return "Government";
  }

  return "Civilian";
}

function cleanAnalysisText(value: string): string {
  return value
    .replace(/\bareaFocus\b/g, "selected area")
    .replace(/\bvesselCount\b/g, "vessel count")
    .replace(/\baircraftCount\b/g, "aircraft count")
    .replace(/\blandmarkContext\b/g, "landmark context")
    .replace(/\bselectedVessel\b/g, "selected vessel");
}

function formatAircraftSpeed(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(0)} kt`;
}

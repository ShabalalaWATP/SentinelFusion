import type { Aircraft } from "@aisstream/shared";
import {
  ArrowUpDown,
  Building2,
  Compass,
  Crosshair,
  Gauge,
  Hash,
  MapPinned,
  Plane,
  Timer
} from "lucide-react";
import { useMemo } from "react";
import { selectAircraftFilters, useAircraftFilterStore } from "../../stores/aircraftFilterStore";
import { filterAircraftBySettings } from "../../traffic/trafficFilters";
import { AircraftBadges } from "./AircraftBadges";
import { AircraftFilterControls } from "./AircraftFilterControls";

type AircraftSummaryProps = {
  aircraft: Aircraft;
};

type AircraftListProps = {
  aircraft: Aircraft[];
  selectedAircraftId: string | null;
  onInspectAircraft(aircraft: Aircraft): void;
};

export function AircraftSummary({ aircraft }: AircraftSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyan-300/[0.12] text-cyan-100">
            <Plane size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-50">
              {aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase()}
            </p>
            <p className="truncate text-xs text-slate-400">
              {aircraft.aircraftType ?? classificationLabel(aircraft)}
            </p>
          </div>
        </div>
        <AircraftBadges aircraft={aircraft} />
      </div>

      <AircraftDetailGrid aircraft={aircraft} />
    </div>
  );
}

export function AircraftList({
  aircraft,
  onInspectAircraft,
  selectedAircraftId
}: AircraftListProps) {
  const filters = useAircraftFilterStore(selectAircraftFilters);
  const filteredAircraft = useMemo(
    () => filterAircraftBySettings(aircraft, filters).slice(0, 24),
    [aircraft, filters]
  );

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
            Aircraft
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">
            Live flight tracks
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          {filteredAircraft.length.toLocaleString("en-GB")} / {aircraft.length.toLocaleString("en-GB")}
        </span>
      </div>

      <AircraftFilterControls />

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {filteredAircraft.length > 0 ? (
          filteredAircraft.map((item) => (
            <AircraftRow
              key={item.id}
              aircraft={item}
              selected={item.id === selectedAircraftId}
              onInspect={() => onInspectAircraft(item)}
            />
          ))
        ) : (
          <p className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.26] p-3 text-sm leading-5 text-slate-400">
            No aircraft match the current filters.
          </p>
        )}
      </div>
    </section>
  );
}

function AircraftRow({
  aircraft,
  onInspect,
  selected
}: {
  aircraft: Aircraft;
  onInspect(): void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onInspect}
      className={`w-full rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
        selected
          ? "border-amber-300/[0.72] bg-amber-300/[0.12]"
          : "border-slate-500/[0.16] bg-slate-950/[0.30] hover:border-cyan-300/[0.35]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-slate-100">
          {aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase()}
        </span>
        <span className="shrink-0 text-xs text-slate-400">
          {formatAltitude(aircraft.altitudeFt)}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-400">
        {aircraft.operator ?? aircraft.aircraftType ?? classificationLabel(aircraft)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{formatSpeed(aircraft.groundSpeedKt)}</span>
        <span>{aircraft.icao24.toUpperCase()}</span>
        <Crosshair size={13} aria-hidden="true" />
      </div>
    </button>
  );
}

function AircraftDetailGrid({ aircraft }: { aircraft: Aircraft }) {
  const items = [
    { label: "ICAO hex", value: aircraft.icao24.toUpperCase(), icon: <Hash size={16} aria-hidden="true" /> },
    { label: "Altitude", value: formatAltitude(aircraft.altitudeFt), icon: <ArrowUpDown size={16} aria-hidden="true" /> },
    { label: "Speed", value: formatSpeed(aircraft.groundSpeedKt), icon: <Gauge size={16} aria-hidden="true" /> },
    { label: "Track", value: formatTrack(aircraft.trackDegrees), icon: <Compass size={16} aria-hidden="true" /> },
    { label: "Operator", value: aircraft.operator ?? "Unknown", icon: <Building2 size={16} aria-hidden="true" /> },
    { label: "Route", value: formatRoute(aircraft), icon: <MapPinned size={16} aria-hidden="true" /> },
    { label: "Squawk", value: aircraft.squawk ?? "Unknown", icon: <Plane size={16} aria-hidden="true" /> },
    { label: "Last update", value: formatTime(aircraft.lastUpdated), icon: <Timer size={16} aria-hidden="true" /> }
  ];

  return (
    <dl className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-900 text-cyan-100">
            {item.icon}
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
              {item.label}
            </dt>
            <dd className="truncate text-sm font-medium text-slate-100">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function classificationLabel(aircraft: Aircraft): string {
  return aircraft.classification === "unknown" ? "Unclassified aircraft" : aircraft.classification;
}

function formatAltitude(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Math.round(value).toLocaleString("en-GB")} ft`;
}

function formatSpeed(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${value.toFixed(0)} kt`;
}

function formatTrack(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Math.round(value)} deg`;
}

function formatRoute(aircraft: Aircraft): string {
  if (aircraft.originAirport && aircraft.destinationAirport) {
    return `${aircraft.originAirport} to ${aircraft.destinationAirport}`;
  }

  return aircraft.originCountry ?? "Unknown";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

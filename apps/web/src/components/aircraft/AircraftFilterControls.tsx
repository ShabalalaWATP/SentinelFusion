import type { AircraftClassification } from "@aisstream/shared";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Gauge,
  Plane,
  RotateCcw,
  Search,
  Shield
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  selectActiveAircraftFilterCount,
  selectAircraftFilters,
  useAircraftFilterStore
} from "../../stores/aircraftFilterStore";

const classificationOptions: Array<{
  label: string;
  value: AircraftClassification;
  icon: LucideIcon;
}> = [
  { label: "Military", value: "military", icon: Shield },
  { label: "Government", value: "government", icon: Building2 },
  { label: "Commercial", value: "commercial", icon: Plane }
];

export function AircraftFilterControls() {
  const filters = useAircraftFilterStore(selectAircraftFilters);
  const activeCount = useAircraftFilterStore(selectActiveAircraftFilterCount);
  const resetFilters = useAircraftFilterStore((state) => state.resetFilters);
  const setFilter = useAircraftFilterStore((state) => state.setFilter);
  const toggleClassification = useAircraftFilterStore((state) => state.toggleClassification);

  return (
    <div className="mt-3 space-y-3 rounded-md border border-slate-500/[0.16] bg-slate-950/[0.22] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
            Filters
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {activeCount === 0 ? "Showing all live aircraft" : `${activeCount} active`}
          </p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={activeCount === 0}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-500/[0.18] bg-slate-900 px-2.5 text-xs font-medium text-slate-300 transition hover:border-cyan-300/[0.45] hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>

      <label htmlFor="aircraft-search" className="sr-only">
        Search aircraft
      </label>
      <div className="flex items-center gap-2 rounded-md border border-slate-500/[0.18] bg-slate-950 px-3 py-2 text-slate-400">
        <Search size={14} aria-hidden="true" />
        <input
          id="aircraft-search"
          value={filters.query}
          onChange={(event) => setFilter("query", event.target.value)}
          placeholder="Callsign, reg, hex, operator"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {classificationOptions.map((option) => {
          const Icon = option.icon;
          const active = filters.classifications.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleClassification(option.value)}
              aria-pressed={active}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
                active
                  ? "border-cyan-300/[0.55] bg-cyan-300/[0.14] text-cyan-100"
                  : "border-slate-500/[0.16] bg-slate-950/[0.28] text-slate-400 hover:text-slate-100"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
        <ToggleFilterButton
          active={filters.emergencyOnly}
          icon={<AlertTriangle size={13} aria-hidden="true" />}
          label="Emergency"
          onClick={() => setFilter("emergencyOnly", !filters.emergencyOnly)}
        />
        <ToggleFilterButton
          active={filters.airborneOnly}
          icon={<Plane size={13} aria-hidden="true" />}
          label="Airborne"
          onClick={() => setFilter("airborneOnly", !filters.airborneOnly)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberFilter
          icon={<ArrowUpDown size={13} aria-hidden="true" />}
          label="Min ft"
          value={filters.minAltitudeFt}
          onChange={(value) => setFilter("minAltitudeFt", value)}
        />
        <NumberFilter
          icon={<ArrowUpDown size={13} aria-hidden="true" />}
          label="Max ft"
          value={filters.maxAltitudeFt}
          onChange={(value) => setFilter("maxAltitudeFt", value)}
        />
        <NumberFilter
          icon={<Gauge size={13} aria-hidden="true" />}
          label="Min kt"
          value={filters.minSpeedKt}
          onChange={(value) => setFilter("minSpeedKt", value)}
        />
        <NumberFilter
          icon={<Gauge size={13} aria-hidden="true" />}
          label="Max kt"
          value={filters.maxSpeedKt}
          onChange={(value) => setFilter("maxSpeedKt", value)}
        />
      </div>
    </div>
  );
}

function ToggleFilterButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
        active
          ? "border-amber-300/[0.60] bg-amber-300/[0.12] text-amber-100"
          : "border-slate-500/[0.16] bg-slate-950/[0.28] text-slate-400 hover:text-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function NumberFilter({
  icon,
  label,
  onChange,
  value
}: {
  icon: ReactNode;
  label: string;
  onChange(value: number | null): void;
  value: number | null;
}) {
  return (
    <label className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-2.5 py-2">
      <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-normal text-slate-500">
        {icon}
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(event) => onChange(toOptionalNumber(event.target.value))}
        className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600"
        placeholder="Any"
      />
    </label>
  );
}

function toOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

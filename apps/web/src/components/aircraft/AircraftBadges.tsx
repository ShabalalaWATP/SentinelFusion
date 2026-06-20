import { AlertTriangle, BadgeCheck, Plane, Shield } from "lucide-react";
import type { Aircraft } from "@aisstream/shared";
import { RiskDot } from "../vessels/VesselBadges";

export function AircraftBadges({ aircraft }: { aircraft: Aircraft }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {aircraft.emergency ? <EmergencyBadge /> : null}
      {aircraft.classification === "military" ? <MilitaryBadge /> : null}
      {aircraft.classification === "government" ? <GovernmentBadge /> : null}
      {aircraft.classification === "commercial" ? <CommercialBadge /> : null}
      <RiskDot risk={aircraft.riskLevel} />
    </div>
  );
}

function EmergencyBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs uppercase tracking-normal text-red-200">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-red-400/[0.22] text-red-100">
        <AlertTriangle size={12} aria-hidden="true" />
      </span>
      Emergency
    </span>
  );
}

function MilitaryBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs uppercase tracking-normal text-violet-200">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-400/[0.22] text-violet-100">
        <Shield size={12} aria-hidden="true" />
      </span>
      Military
    </span>
  );
}

function GovernmentBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs uppercase tracking-normal text-sky-200">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-sky-400/[0.20] text-sky-100">
        <BadgeCheck size={12} aria-hidden="true" />
      </span>
      Gov
    </span>
  );
}

function CommercialBadge() {
  return (
    <span className="hidden items-center gap-1.5 text-xs uppercase tracking-normal text-cyan-200 sm:flex">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-cyan-400/[0.18] text-cyan-100">
        <Plane size={12} aria-hidden="true" />
      </span>
      Airliner
    </span>
  );
}

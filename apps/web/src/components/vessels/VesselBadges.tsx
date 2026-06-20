import { BadgeCheck, Shield } from "lucide-react";
import { classifyVessel, type Vessel } from "@aisstream/shared";

export function VesselBadges({ vessel }: { vessel: Vessel }) {
  const classification = classifyVessel(vessel);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {classification === "military" ? <MilitaryBadge /> : null}
      {classification === "government" ? <GovernmentBadge /> : null}
      <RiskDot risk={vessel.riskLevel} />
    </div>
  );
}

export function RiskDot({ risk }: { risk: Vessel["riskLevel"] }) {
  const className =
    risk === "high"
      ? "bg-red-400"
      : risk === "medium"
        ? "bg-amber-300"
        : "bg-teal-300";

  return (
    <span className="flex items-center gap-2 text-xs uppercase tracking-normal text-slate-400">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {risk}
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

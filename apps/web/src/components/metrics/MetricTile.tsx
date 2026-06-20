import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "cyan" | "teal" | "amber" | "red";
};

const toneClasses = {
  cyan: "text-cyan-200 border-cyan-300/[0.20]",
  teal: "text-teal-200 border-teal-300/[0.20]",
  amber: "text-amber-200 border-amber-300/[0.24]",
  red: "text-red-200 border-red-300/[0.24]"
};

export function MetricTile({ label, value, icon, tone = "cyan" }: MetricTileProps) {
  return (
    <div className={`flex min-w-0 items-center gap-2 border-l px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-2 ${toneClasses[tone]}`}>
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-950/[0.45] sm:h-9 sm:w-9">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-normal text-slate-400 sm:text-[11px]">
          {label}
        </p>
        <p className="truncate text-sm font-semibold leading-5 text-slate-50 sm:text-lg sm:leading-6">{value}</p>
      </div>
    </div>
  );
}

import { Bell, Radar, Route, Settings, Shield } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import type { DashboardPanel } from "./DashboardShell";

type LeftRailProps = {
  activePanel: DashboardPanel;
  onPanelChange(panel: DashboardPanel): void;
};

export function LeftRail({ activePanel, onPanelChange }: LeftRailProps) {
  return (
    <aside className="flex h-14 w-full shrink-0 items-center border-b border-slate-500/[0.15] bg-ocean-950/[0.95] px-3 md:h-full md:w-16 md:flex-col md:border-b-0 md:border-r md:py-4">
      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-md border border-cyan-300/[0.40] bg-cyan-300/[0.08]">
        <img
          src="/sentinel-fusion-logo-transparent.png"
          alt="Sentinel Fusion"
          className="h-9 w-9 object-contain"
        />
      </div>

      <nav className="ml-4 flex flex-1 gap-3 md:ml-0 md:mt-7 md:flex-col" aria-label="Primary">
        <IconButton
          label="Vessel overview"
          active={activePanel === "overview"}
          aria-pressed={activePanel === "overview"}
          onClick={() => onPanelChange("overview")}
        >
          <Radar size={18} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Routes and observed tracks"
          active={activePanel === "routes"}
          aria-pressed={activePanel === "routes"}
          onClick={() => onPanelChange("routes")}
        >
          <Route size={18} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Alerts"
          active={activePanel === "alerts"}
          aria-pressed={activePanel === "alerts"}
          onClick={() => onPanelChange("alerts")}
        >
          <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Military intel"
          active={activePanel === "military"}
          aria-pressed={activePanel === "military"}
          onClick={() => onPanelChange("military")}
        >
          <Shield size={18} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
      </nav>

      <IconButton
        label="Settings"
        active={activePanel === "settings"}
        aria-pressed={activePanel === "settings"}
        className="ml-auto md:ml-0"
        onClick={() => onPanelChange("settings")}
      >
        <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
      </IconButton>
    </aside>
  );
}

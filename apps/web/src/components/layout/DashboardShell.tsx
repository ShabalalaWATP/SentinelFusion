import { useState } from "react";
import { MapCanvas } from "../map/MapCanvas";
import { TopMetricsBar } from "../metrics/TopMetricsBar";
import { VesselDrawer } from "../vessels/VesselDrawer";
import { LeftRail } from "./LeftRail";

export type DashboardPanel = "overview" | "routes" | "alerts" | "military" | "settings";

export function DashboardShell() {
  const [activePanel, setActivePanel] = useState<DashboardPanel>("overview");

  return (
    <div className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-ocean-950 text-slate-50 md:flex-row">
      <LeftRail activePanel={activePanel} onPanelChange={setActivePanel} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopMetricsBar />
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <MapCanvas showRoutes={activePanel === "routes"} />
          <VesselDrawer activePanel={activePanel} onPanelChange={setActivePanel} />
        </div>
      </main>
    </div>
  );
}

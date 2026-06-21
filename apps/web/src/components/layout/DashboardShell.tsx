import { Suspense, lazy, useState } from "react";
import { TopMetricsBar } from "../metrics/TopMetricsBar";
import { VesselDrawer } from "../vessels/VesselDrawer";
import { LeftRail } from "./LeftRail";

export type DashboardPanel = "overview" | "routes" | "alerts" | "military" | "settings";

const MapCanvas = lazy(() =>
  import("../map/MapCanvas").then((module) => ({ default: module.MapCanvas }))
);

function MapCanvasFallback() {
  return (
    <section className="relative h-full min-h-[18rem] flex-1 overflow-hidden bg-ocean-950 lg:min-h-0">
      <div className="absolute inset-0 bg-ocean-950" />
      <div className="absolute left-3 top-3 z-10 rounded-md border border-slate-500/[0.18] bg-ocean-900/[0.82] px-3 py-2 text-xs text-slate-300 shadow-panel backdrop-blur sm:left-4 sm:top-4">
        Loading map
      </div>
    </section>
  );
}

export function DashboardShell() {
  const [activePanel, setActivePanel] = useState<DashboardPanel>("overview");

  return (
    <div className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-ocean-950 text-slate-50 md:flex-row">
      <LeftRail activePanel={activePanel} onPanelChange={setActivePanel} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopMetricsBar />
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <Suspense fallback={<MapCanvasFallback />}>
            <MapCanvas showRoutes={activePanel === "routes"} />
          </Suspense>
          <VesselDrawer activePanel={activePanel} onPanelChange={setActivePanel} />
        </div>
      </main>
    </div>
  );
}

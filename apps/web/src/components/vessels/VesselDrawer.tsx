import { Anchor, ArrowLeft, Compass, Gauge, Route, Ship, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useShallow } from "zustand/react/shallow";
import {
  toFleetAnalysisAircraftIntel,
  toFleetAnalysisIntel,
  toSelectedAnalysisIntel
} from "../../analysis/analysisIntelContext";
import { AircraftList, AircraftSummary } from "../aircraft/AircraftDetails";
import { AircraftIntelPanel } from "../aircraft/AircraftIntelPanel";
import {
  AnalysisModeSwitch,
  AreaAnalysisForm,
  VesselAnalysisForm
} from "../analysis/DrawerAnalysisForms";
import { type AnalysisMode, questionForAnalysisMode } from "../analysis/analysisDefaults";
import { AlertsPanel } from "../alerts/AlertsPanel";
import type { DashboardPanel } from "../layout/DashboardShell";
import { TrafficTrackingControls } from "../map/TrafficTrackingControls";
import { MilitaryIntelPanel } from "../military/MilitaryIntelPanel";
import { RoutePanel } from "../routes/RoutePanel";
import { SettingsPanel } from "../settings/SettingsPanel";
import { VesselBadges } from "./VesselBadges";
import { VesselIntelPanel } from "./VesselIntelPanel";
import {
  selectAircraftList,
  selectSelectedAircraft,
  useAircraftStore
} from "../../stores/aircraftStore";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useAircraftIntelStore } from "../../stores/aircraftIntelStore";
import { useMapStore } from "../../stores/mapStore";
import { useVesselIntelStore } from "../../stores/vesselIntelStore";
import { useVisibleTraffic } from "../../hooks/useVisibleTraffic";
import {
  selectSelectedVessel,
  selectVesselList,
  useVesselStore
} from "../../stores/vesselStore";

const areaDefaultQuestion = questionForAnalysisMode("area");
const vesselDefaultQuestion = questionForAnalysisMode("vessel");

type VesselDrawerProps = {
  activePanel: DashboardPanel;
  onPanelChange(panel: DashboardPanel): void;
};

export function VesselDrawer({ activePanel, onPanelChange }: VesselDrawerProps) {
  const selectedVessel = useVesselStore(selectSelectedVessel);
  const vessels = useVesselStore(useShallow(selectVesselList));
  const selectedAircraft = useAircraftStore(selectSelectedAircraft);
  const aircraft = useAircraftStore(useShallow(selectAircraftList));
  const { visibleAircraft, visibleVessels } = useVisibleTraffic();
  const selectAircraft = useAircraftStore((state) => state.selectAircraft);
  const selectVessel = useVesselStore((state) => state.selectVessel);
  const clearAreaFocus = useMapStore((state) => state.clearAreaFocus);
  const domainFilter = useMapStore((state) => state.domainFilter);
  const setDomainFilter = useMapStore((state) => state.setDomainFilter);
  const startTrackingAircraft = useMapStore((state) => state.startTrackingAircraft);
  const startTrackingVessel = useMapStore((state) => state.startTrackingVessel);
  const aircraftIntelResults = useAircraftIntelStore((state) => state.results);
  const vesselIntelResults = useVesselIntelStore((state) => state.results);
  const analysis = useAnalysisStore();
  const clearAnalysisResult = useAnalysisStore((state) => state.clearResult);
  const setAnalysisQuestion = useAnalysisStore((state) => state.setQuestion);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("area");
  const selectedVesselId = selectedVessel?.id;
  const selectedAircraftId = selectedAircraft?.id;

  useEffect(() => {
    clearAnalysisResult();
    clearAreaFocus();
    setAnalysisMode(selectedVesselId && !selectedAircraftId ? "vessel" : "area");
    setAnalysisQuestion(selectedVesselId && !selectedAircraftId ? vesselDefaultQuestion : areaDefaultQuestion);
  }, [
    clearAnalysisResult,
    clearAreaFocus,
    selectedAircraftId,
    selectedVesselId,
    setAnalysisQuestion
  ]);

  function changeAnalysisMode(mode: AnalysisMode): void {
    setAnalysisMode(mode);
    clearAnalysisResult();
    setAnalysisQuestion(mode === "vessel" ? vesselDefaultQuestion : areaDefaultQuestion);
  }

  function inspectVessel(id: string, nextPanel: DashboardPanel = "overview"): void {
    const vessel = vessels.find((item) => item.id === id);
    selectVessel(id);
    selectAircraft(null);
    setDomainFilter("vessels");
    if (vessel) {
      startTrackingVessel(vessel);
    }
    onPanelChange(nextPanel);
  }

  function inspectAircraft(target: Aircraft, nextPanel: DashboardPanel = "overview"): void {
    selectAircraft(target.id);
    selectVessel(null);
    setDomainFilter("aircraft");
    startTrackingAircraft(target);
    onPanelChange(nextPanel);
  }

  function inspectAircraftById(id: string, nextPanel: DashboardPanel = "overview"): void {
    const target = aircraft.find((item) => item.id === id);
    if (target) {
      inspectAircraft(target, nextPanel);
    }
  }

  function returnToAreaAnalysis(): void {
    selectVessel(null);
    selectAircraft(null);
    clearAreaFocus();
    clearAnalysisResult();
    setAnalysisMode("area");
    setAnalysisQuestion(areaDefaultQuestion);
    onPanelChange("overview");
  }

  if (activePanel === "routes") {
    return (
      <RoutePanel
        onInspectAircraft={(id) => inspectAircraftById(id, "routes")}
        onInspectVessel={(id) => inspectVessel(id, "routes")}
      />
    );
  }

  if (activePanel === "alerts") {
    return (
      <AlertsPanel
        aircraft={visibleAircraft}
        vessels={visibleVessels}
        onInspectAircraft={inspectAircraftById}
        onInspectVessel={inspectVessel}
      />
    );
  }

  if (activePanel === "military") {
    return (
      <MilitaryIntelPanel
        aircraft={aircraft}
        onInspectAircraft={inspectAircraft}
        onInspectVessel={(vessel) => inspectVessel(vessel.id)}
        vessels={vessels}
      />
    );
  }

  if (activePanel === "settings") {
    return <SettingsPanel />;
  }

  return (
    <aside className="flex h-[13rem] w-full shrink-0 flex-col border-t border-slate-500/[0.15] bg-ocean-900/[0.96] shadow-panel sm:h-[16rem] lg:h-full lg:w-[22rem] lg:border-l lg:border-t-0">
      <div className="border-b border-slate-500/[0.15] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          {selectedVessel || selectedAircraft ? (
            <button
              type="button"
              onClick={returnToAreaAnalysis}
              aria-label="Back to area analysis"
              title="Back to area analysis"
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-950/[0.35] text-slate-300 transition hover:border-cyan-300/[0.45] hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.35]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
              {selectedAircraft ? "Aircraft details" : "Vessel details"}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold leading-7 text-slate-50">
              {selectedAircraft
                ? aircraftLabel(selectedAircraft)
                : selectedVessel?.name ?? "No vessel selected"}
            </h2>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {selectedAircraft ? (
          <div className="space-y-4">
            <AircraftSummary aircraft={selectedAircraft} />
            <TrafficTrackingControls domain="aircraft" target={selectedAircraft} />
            <AircraftIntelPanel aircraft={selectedAircraft} />
            <AreaAnalysisForm
              analysis={analysis}
              aircraftIntel={toFleetAnalysisAircraftIntel(aircraftIntelResults)}
              vesselIntel={toFleetAnalysisIntel(vesselIntelResults)}
              onInspectAircraft={inspectAircraftById}
              onInspectVessel={inspectVessel}
            />
          </div>
        ) : selectedVessel ? (
          <div className="space-y-4">
            <VesselSummary vessel={selectedVessel} />
            <TrafficTrackingControls domain="vessel" target={selectedVessel} />
            <AnalysisModeSwitch mode={analysisMode} onChange={changeAnalysisMode} />
            {analysisMode === "vessel" ? (
              <VesselAnalysisForm
                vessel={selectedVessel}
                analysis={analysis}
                vesselIntel={toSelectedAnalysisIntel(vesselIntelResults[selectedVessel.id])}
                onInspectVessel={inspectVessel}
              />
            ) : (
              <AreaAnalysisForm
                analysis={analysis}
                aircraftIntel={toFleetAnalysisAircraftIntel(aircraftIntelResults)}
                vesselIntel={toFleetAnalysisIntel(vesselIntelResults)}
                onInspectAircraft={inspectAircraftById}
                onInspectVessel={inspectVessel}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AreaAnalysisForm
              analysis={analysis}
              aircraftIntel={toFleetAnalysisAircraftIntel(aircraftIntelResults)}
              vesselIntel={toFleetAnalysisIntel(vesselIntelResults)}
              onInspectAircraft={inspectAircraftById}
              onInspectVessel={inspectVessel}
            />
            {domainFilter === "aircraft" ? (
              <AircraftList
                aircraft={visibleAircraft}
                selectedAircraftId={selectedAircraftId ?? null}
                onInspectAircraft={inspectAircraft}
              />
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

type VesselSummaryProps = {
  vessel: Vessel;
};

function VesselSummary({ vessel }: VesselSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyan-300/[0.12] text-cyan-100">
            <Ship size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-50">{vessel.mmsi}</p>
            <p className="truncate text-xs text-slate-400">{vessel.shipType}</p>
          </div>
        </div>
        <VesselBadges vessel={vessel} />
      </div>

      <DetailGrid vessel={vessel} />
      <VesselIntelPanel vessel={vessel} />
    </div>
  );
}

function DetailGrid({ vessel }: { vessel: Vessel }) {
  const items = [
    {
      label: "Course",
      value: `${Math.round(vessel.courseOverGround)}°`,
      icon: <Compass size={16} aria-hidden="true" />
    },
    {
      label: "Speed",
      value: `${vessel.speedOverGround.toFixed(1)} kn`,
      icon: <Gauge size={16} aria-hidden="true" />
    },
    {
      label: "Destination",
      value: vessel.destination ?? "Unknown",
      icon: <Anchor size={16} aria-hidden="true" />
    },
    {
      label: "Last update",
      value: formatTime(vessel.lastUpdated),
      icon: <Timer size={16} aria-hidden="true" />
    },
    {
      label: "Status",
      value: vessel.navigationalStatus,
      icon: <Route size={16} aria-hidden="true" />
    }
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

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
}

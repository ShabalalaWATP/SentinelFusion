import { ChevronDown, ChevronUp, Globe2, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { MapProjection, MapStyleId } from "@aisstream/shared";
import { mapStyleRegistry } from "../../map/MapStyleRegistry";
import { type IntelligenceLayerId, useMapStore } from "../../stores/mapStore";

const intelligenceLayerOptions: Array<{ id: IntelligenceLayerId; label: string }> = [
  { id: "ports", label: "Ports" },
  { id: "airports", label: "Airports" },
  { id: "chokepoints", label: "Chokepoints" },
  { id: "fire-anomalies", label: "Fire points" },
  { id: "risk-zones", label: "Risk zones" },
  { id: "shipping-lanes", label: "Shipping lanes" },
  { id: "maritime-zones", label: "Maritime zones" }
];

export function MapControls() {
  const [isOpen, setIsOpen] = useState(false);
  const styleId = useMapStore((state) => state.styleId);
  const projection = useMapStore((state) => state.projection);
  const intelligenceLayers = useMapStore((state) => state.intelligenceLayers);
  const setStyleId = useMapStore((state) => state.setStyleId);
  const setProjection = useMapStore((state) => state.setProjection);
  const toggleIntelligenceLayer = useMapStore((state) => state.toggleIntelligenceLayer);

  return (
    <div className="pointer-events-auto max-w-[calc(100vw-1.5rem)]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="map-controls-panel"
        title={isOpen ? "Collapse map controls" : "Expand map controls"}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-500/[0.20] bg-ocean-900/[0.92] px-3 text-sm font-medium text-slate-100 shadow-panel backdrop-blur transition hover:border-cyan-300/[0.50] focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28]"
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Map controls
        {isOpen ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </button>

      {isOpen ? (
        <div
          id="map-controls-panel"
          className="mt-2 w-[calc(100vw-1.5rem)] max-w-72 rounded-md border border-slate-500/[0.18] bg-ocean-900/[0.92] p-3 shadow-panel backdrop-blur"
        >
          <label
            htmlFor="map-style-select"
            className="block text-[11px] font-medium uppercase tracking-normal text-slate-400"
          >
            Map style
          </label>
          <select
            id="map-style-select"
            value={styleId}
            onChange={(event) => setStyleId(event.target.value as MapStyleId)}
            className="mt-2 h-10 w-full rounded-md border border-slate-500/[0.20] bg-slate-950/[0.55] px-3 text-sm text-slate-50 outline-none focus:border-cyan-300/[0.70] focus:ring-2 focus:ring-cyan-300/[0.22]"
          >
            {mapStyleRegistry.listStyles().map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
              Projection
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mapStyleRegistry.listProjections().map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  title={candidate.description}
                  onClick={() => setProjection(candidate.id)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
                    projection === candidate.id
                      ? "border-cyan-300/[0.65] bg-cyan-300/[0.14] text-cyan-100"
                      : "border-slate-500/[0.18] bg-slate-950/[0.36] text-slate-300 hover:border-cyan-300/[0.45]"
                  }`}
                >
                  {candidate.id === "globe" ? (
                    <Globe2 size={16} aria-hidden="true" />
                  ) : (
                    <MapIcon size={16} aria-hidden="true" />
                  )}
                  {projectionLabel(candidate.id)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
              Intelligence layers
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {intelligenceLayerOptions.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggleIntelligenceLayer(layer.id)}
                  aria-pressed={intelligenceLayers[layer.id]}
                  className={`min-h-9 rounded-md border px-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
                    intelligenceLayers[layer.id]
                      ? "border-cyan-300/[0.55] bg-cyan-300/[0.12] text-cyan-50"
                      : "border-slate-500/[0.18] bg-slate-950/[0.36] text-slate-300 hover:border-cyan-300/[0.45]"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function projectionLabel(projection: MapProjection): string {
  return projection === "globe" ? "Globe" : "Mercator";
}

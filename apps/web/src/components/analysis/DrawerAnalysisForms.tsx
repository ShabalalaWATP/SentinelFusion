import { Send, Square, Trash2 } from "lucide-react";
import { useEffect, type FormEvent } from "react";
import type {
  AnalysisAircraftIntelContext,
  AnalysisVesselIntelContext,
  Vessel
} from "@aisstream/shared";
import { type AnalysisState } from "../../stores/analysisStore";
import { useMapStore } from "../../stores/mapStore";
import type { AnalysisMode } from "./analysisDefaults";
import { AnalysisResult } from "./AnalysisResult";
import { OperationalAreaTools } from "./OperationalAreaTools";

const selectedAreaQuestion = "How many vessels are in the selected map area?";
const selectedAircraftAreaQuestion = "How many aircraft are in the selected map area?";
const defaultAreaQuestion = "How many vessels are in the Portsmouth area?";
const defaultAircraftAreaQuestion = "How many aircraft are in the Portsmouth area?";

export function AnalysisModeSwitch({
  mode,
  onChange
}: {
  mode: AnalysisMode;
  onChange(mode: AnalysisMode): void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-1">
      {(["area", "vessel"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-pressed={mode === item}
          className={`rounded px-3 py-2 text-sm font-medium transition ${
            mode === item
              ? "bg-cyan-300/[0.16] text-cyan-50"
              : "text-slate-400 hover:bg-slate-800/[0.7] hover:text-slate-100"
          }`}
        >
          {item === "area" ? "Area analysis" : "Vessel analysis"}
        </button>
      ))}
    </div>
  );
}

export function AreaAnalysisForm({
  analysis,
  aircraftIntel,
  onInspectAircraft,
  onInspectVessel,
  vesselIntel
}: {
  analysis: AnalysisState;
  aircraftIntel: AnalysisAircraftIntelContext[] | undefined;
  onInspectAircraft(id: string): void;
  onInspectVessel(id: string): void;
  vesselIntel: AnalysisVesselIntelContext[] | undefined;
}) {
  const canSubmit = analysis.question.trim().length >= 3 && analysis.status !== "loading";
  const areaSelection = useMapStore((state) => state.areaSelection);
  const clearAreaSelection = useMapStore((state) => state.clearAreaSelection);
  const domainFilter = useMapStore((state) => state.domainFilter);
  const isAreaDrawing = useMapStore((state) => state.isAreaDrawing);
  const startAreaDrawing = useMapStore((state) => state.startAreaDrawing);

  useEffect(() => {
    if (domainFilter === "aircraft" && analysis.question === defaultAreaQuestion) {
      analysis.setQuestion(defaultAircraftAreaQuestion);
      return;
    }

    if (domainFilter !== "aircraft" && analysis.question === defaultAircraftAreaQuestion) {
      analysis.setQuestion(defaultAreaQuestion);
      return;
    }

    if (domainFilter === "aircraft" && analysis.question === selectedAreaQuestion) {
      analysis.setQuestion(selectedAircraftAreaQuestion);
      return;
    }

    if (domainFilter !== "aircraft" && analysis.question === selectedAircraftAreaQuestion) {
      analysis.setQuestion(selectedAreaQuestion);
    }
  }, [analysis, domainFilter]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    useMapStore.getState().clearAreaFocus();
    void analysis.analyse({
      question: analysis.question,
      domain: domainFilter,
      ...(areaSelection ? { areaBounds: areaSelection.bounds } : {}),
      ...(aircraftIntel ? { aircraftIntel } : {}),
      ...(vesselIntel ? { vesselIntel } : {})
    });
  }

  function handleDrawArea(): void {
    analysis.setQuestion(
      domainFilter === "aircraft" ? selectedAircraftAreaQuestion : selectedAreaQuestion
    );
    startAreaDrawing();
  }

  return (
    <>
      <OperationalAreaTools />
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="area-analysis-question"
            className="text-[11px] font-medium uppercase tracking-normal text-slate-400"
          >
            Area analysis
          </label>
          <div className="flex shrink-0 items-center gap-2">
            {areaSelection ? (
              <button
                type="button"
                onClick={clearAreaSelection}
                aria-label="Clear selected map area"
                title="Clear selected map area"
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-500/[0.18] bg-slate-950 text-slate-300 transition hover:border-red-300/[0.45] hover:text-red-100"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDrawArea}
              disabled={isAreaDrawing}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.10] px-3 py-2 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/[0.16] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
            >
              <Square size={14} aria-hidden="true" />
              {isAreaDrawing ? "Drawing" : "Draw box"}
            </button>
          </div>
        </div>
        {areaSelection ? <SelectedAreaSummary /> : null}
        <AnalysisTextarea id="area-analysis-question" analysis={analysis} />
        <SubmitButton label="Ask AI" loadingLabel="Analysing" status={analysis.status} disabled={!canSubmit} />
        <AnalysisStatus
          analysis={analysis}
          onInspectAircraft={onInspectAircraft}
          onInspectVessel={onInspectVessel}
        />
      </form>
    </>
  );
}

export function VesselAnalysisForm({
  analysis,
  onInspectVessel,
  vessel,
  vesselIntel
}: {
  analysis: AnalysisState;
  onInspectVessel(id: string): void;
  vessel: Vessel;
  vesselIntel: AnalysisVesselIntelContext[] | undefined;
}) {
  const canSubmit = analysis.question.trim().length >= 3 && analysis.status !== "loading";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    useMapStore.getState().clearAreaFocus();
    void analysis.analyse({
      question: analysis.question,
      domain: "vessels",
      vesselId: vessel.id,
      ...(vesselIntel ? { vesselIntel } : {})
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3"
    >
      <label
        htmlFor="analysis-question"
        className="text-[11px] font-medium uppercase tracking-normal text-slate-400"
      >
        Analysis
      </label>
      <AnalysisTextarea id="analysis-question" analysis={analysis} />
      <SubmitButton label="Analyse" loadingLabel="Analysing" status={analysis.status} disabled={!canSubmit} />
      <AnalysisStatus analysis={analysis} onInspectVessel={onInspectVessel} />
    </form>
  );
}

function SelectedAreaSummary() {
  const areaSelection = useMapStore((state) => state.areaSelection);

  if (!areaSelection) {
    return null;
  }

  return (
    <p className="mt-2 rounded-md border border-cyan-300/[0.16] bg-cyan-300/[0.08] px-2.5 py-2 text-xs leading-5 text-cyan-50">
      Selected map area: {areaSelection.bounds.south.toFixed(3)},{" "}
      {areaSelection.bounds.west.toFixed(3)} to {areaSelection.bounds.north.toFixed(3)},{" "}
      {areaSelection.bounds.east.toFixed(3)}
    </p>
  );
}

function AnalysisTextarea({ analysis, id }: { analysis: AnalysisState; id: string }) {
  return (
    <textarea
      id={id}
      value={analysis.question}
      onChange={(event) => analysis.setQuestion(event.target.value)}
      rows={3}
      maxLength={1000}
      className="mt-2 w-full resize-none rounded-md border border-slate-500/[0.18] bg-slate-950 px-3 py-2 text-sm leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/[0.55] focus:ring-2 focus:ring-cyan-300/[0.15]"
    />
  );
}

function SubmitButton({
  disabled,
  label,
  loadingLabel,
  status
}: {
  disabled: boolean;
  label: string;
  loadingLabel: string;
  status: AnalysisState["status"];
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.12] px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/[0.18] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
    >
      <Send size={15} aria-hidden="true" />
      {status === "loading" ? loadingLabel : label}
    </button>
  );
}

function AnalysisStatus({
  analysis,
  onInspectAircraft,
  onInspectVessel
}: {
  analysis: AnalysisState;
  onInspectAircraft?(id: string): void;
  onInspectVessel(id: string): void;
}) {
  return (
    <>
      {analysis.error ? (
        <p className="mt-3 text-sm leading-5 text-red-200">{analysis.error}</p>
      ) : null}
      {analysis.result ? (
        <AnalysisResult
          result={analysis.result}
          onInspectAircraft={onInspectAircraft}
          onInspectVessel={onInspectVessel}
        />
      ) : null}
    </>
  );
}

import { RotateCcw } from "lucide-react";
import { alertPresetDefinitions } from "../../alerts/alertPresets";

type AlertPresetId = (typeof alertPresetDefinitions)[number]["id"];

type AlertPresetControlsProps = {
  enabledCount: number;
  onReset(): void;
  onToggle(id: AlertPresetId): void;
  presets: Record<AlertPresetId, boolean>;
};

export function AlertPresetControls({
  enabledCount,
  onReset,
  onToggle,
  presets
}: AlertPresetControlsProps) {
  return (
    <section className="mt-3 rounded-md border border-slate-500/[0.16] bg-slate-950/[0.24] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Alert presets</h3>
          <p className="text-xs text-slate-500">{enabledCount} enabled</p>
        </div>
        <button type="button" onClick={onReset} className="alert-action-button h-8">
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {alertPresetDefinitions.map((preset) => (
          <label
            key={preset.id}
            className="flex cursor-pointer items-start gap-3 rounded border border-slate-500/[0.12] bg-slate-900/[0.36] px-3 py-2"
          >
            <input
              type="checkbox"
              checked={presets[preset.id]}
              onChange={() => onToggle(preset.id)}
              className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
            />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-slate-100">{preset.label}</span>
              <span className="block text-[11px] leading-4 text-slate-500">
                {preset.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

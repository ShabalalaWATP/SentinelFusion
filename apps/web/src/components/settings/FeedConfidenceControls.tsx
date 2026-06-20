import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  selectActiveFeedFilterCount,
  selectFeedConfidenceSettings,
  useFeedFilterStore
} from "../../stores/feedFilterStore";

export function FeedConfidenceControls() {
  const settings = useFeedFilterStore(selectFeedConfidenceSettings);
  const activeCount = useFeedFilterStore(selectActiveFeedFilterCount);
  const setSetting = useFeedFilterStore((state) => state.setSetting);
  const resetSettings = useFeedFilterStore((state) => state.resetSettings);

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-cyan-100" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-50">Feed confidence</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            These filters hide weak live contacts from the map, alerts and lists.
          </p>
        </div>
        <button type="button" onClick={resetSettings} className="alert-action-button h-8">
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">{activeCount} active filters</p>

      <div className="mt-4 grid gap-3">
        <ToggleRow
          checked={settings.hideStaleContacts}
          description="Hide contacts older than the freshness threshold."
          label="Hide stale contacts"
          onChange={(checked) => setSetting("hideStaleContacts", checked)}
        />
        <ToggleRow
          checked={settings.hideUnhealthyFeeds}
          description="Hide a whole domain when its provider is degraded."
          label="Hide unhealthy feeds"
          onChange={(checked) => setSetting("hideUnhealthyFeeds", checked)}
        />
        <label className="grid gap-2 rounded border border-slate-500/[0.12] bg-slate-900/[0.32] px-3 py-3">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-100">
            Freshness threshold
            <span className="text-cyan-100">{settings.maxContactAgeMinutes} min</span>
          </span>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={settings.maxContactAgeMinutes}
            onChange={(event) => setSetting("maxContactAgeMinutes", Number(event.target.value))}
            className="accent-cyan-300"
          />
        </label>
      </div>
    </section>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-slate-500/[0.12] bg-slate-900/[0.32] px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-100">{label}</span>
        <span className="block text-[11px] leading-4 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

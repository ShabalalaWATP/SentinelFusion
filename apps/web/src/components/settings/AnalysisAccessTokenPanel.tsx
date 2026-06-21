import { useState } from "react";
import { useAnalysisAccessStore } from "../../stores/analysisAccessStore";

export function AnalysisAccessTokenPanel() {
  const storedToken = useAnalysisAccessStore((state) => state.token);
  const setToken = useAnalysisAccessStore((state) => state.setToken);
  const clearToken = useAnalysisAccessStore((state) => state.clearToken);
  const [draft, setDraft] = useState(storedToken);

  const hasToken = storedToken.length > 0;

  return (
    <section className="rounded border border-slate-500/[0.18] bg-slate-950/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
            Protected API access
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-50">
            AI and OSINT token
          </h3>
        </div>
        <span
          className={`rounded px-2 py-1 text-[11px] font-semibold ${
            hasToken ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {hasToken ? "Set" : "Missing"}
        </span>
      </div>

      <label className="mt-3 block text-[11px] font-medium uppercase tracking-normal text-slate-400">
        Analysis API token
      </label>
      <input
        className="mt-1 w-full rounded border border-slate-500/[0.22] bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Paste local API token"
        type="password"
        value={draft}
      />
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Stored for this browser session only. Required when the API protects AI,
        web-intel, sanctions, or ACLED conflict context routes.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          className="rounded bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200"
          onClick={() => setToken(draft)}
          type="button"
        >
          Save token
        </button>
        <button
          className="rounded border border-slate-500/[0.24] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-300/60"
          onClick={() => {
            clearToken();
            setDraft("");
          }}
          type="button"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

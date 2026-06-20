import { AlertTriangle, CheckCircle2, Clock3, RadioTower } from "lucide-react";
import type { ReactNode } from "react";

export type ProviderStatusView = {
  connected: boolean;
  connectionStatus: string;
  errors: number;
  lastError: string | null;
  lastMessageAt?: string;
  latencyMs?: number;
  healthy: boolean;
  healthReason: string;
  mode: string;
  name: string;
  normalised: number;
  received: number;
  reconnectAttempts: number;
  state: string;
};

export function ProviderStatusCard({ status }: { status: ProviderStatusView }) {
  return (
    <article className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
            {status.mode}
          </p>
          <h3 className="truncate text-base font-semibold text-slate-50">{status.name}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold ${
            status.healthy ? "bg-teal-300/[0.14] text-teal-100" : "bg-amber-300/[0.16] text-amber-100"
          }`}
        >
          {status.healthy ? <CheckCircle2 size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}
          {status.healthy ? "Healthy" : "Check"}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <StatusMetric icon={<RadioTower size={14} aria-hidden="true" />} label="State" value={status.state} />
        <StatusMetric icon={<Clock3 size={14} aria-hidden="true" />} label="Latency" value={formatLatency(status.latencyMs)} />
        <StatusMetric label="Received" value={formatNumber(status.received)} />
        <StatusMetric label="Normalised" value={formatNumber(status.normalised)} />
        <StatusMetric label="Errors" value={formatNumber(status.errors)} />
        <StatusMetric label="Reconnects" value={formatNumber(status.reconnectAttempts)} />
      </dl>

      <p className="mt-3 truncate text-xs text-slate-500">
        Last message: {status.lastMessageAt ? formatTime(status.lastMessageAt) : "none yet"}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{status.healthReason}</p>
      {status.lastError ? (
        <p className="mt-2 rounded border border-red-300/[0.18] bg-red-950/[0.18] px-2 py-2 text-xs leading-5 text-red-100">
          {status.lastError}
        </p>
      ) : null}
    </article>
  );
}

function StatusMetric({
  icon,
  label,
  value
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-slate-500/[0.12] bg-slate-900/[0.32] px-2 py-2">
      <dt className="flex items-center gap-1 text-[11px] text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium text-slate-100">{value}</dd>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatLatency(value: number | undefined): string {
  if (!value) {
    return "0 ms";
  }

  return value > 999 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

import { AlertTriangle, LocateFixed, PauseCircle } from "lucide-react";
import type { Aircraft, Vessel } from "@aisstream/shared";
import { useAnomalyStore } from "../../stores/anomalyStore";
import { useMapStore } from "../../stores/mapStore";

type TrafficTrackingControlsProps =
  | {
      domain: "aircraft";
      target: Aircraft;
    }
  | {
      domain: "vessel";
      target: Vessel;
    };

export function TrafficTrackingControls({ domain, target }: TrafficTrackingControlsProps) {
  const trackedTarget = useMapStore((state) => state.trackedTarget);
  const startTrackingAircraft = useMapStore((state) => state.startTrackingAircraft);
  const startTrackingVessel = useMapStore((state) => state.startTrackingVessel);
  const stopTracking = useMapStore((state) => state.stopTracking);
  const isEntityMonitored = useAnomalyStore((state) => state.isEntityMonitored);
  const toggleEntityMonitor = useAnomalyStore((state) => state.toggleEntityMonitor);
  const isTracked = trackedTarget?.domain === domain && trackedTarget.id === target.id;
  const isFollowing = isTracked && trackedTarget.follow;
  const isMonitored = isEntityMonitored(domain, target.id);

  function startFollow(): void {
    if (domain === "aircraft") {
      startTrackingAircraft(target, { follow: true });
      return;
    }

    startTrackingVessel(target, { follow: true });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={startFollow}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.10] px-3 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/[0.16]"
      >
        <LocateFixed size={14} aria-hidden="true" />
        {isFollowing ? "Following" : "Follow live"}
      </button>
      <button
        type="button"
        onClick={() => toggleEntityMonitor(domain, target.id)}
        aria-pressed={isMonitored}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition ${
          isMonitored
            ? "border-amber-300/[0.55] bg-amber-300/[0.14] text-amber-100"
            : "border-slate-500/[0.20] bg-slate-950/[0.35] text-slate-300 hover:border-amber-300/[0.45] hover:text-amber-100"
        }`}
      >
        <AlertTriangle size={14} aria-hidden="true" />
        {isMonitored ? "Monitoring" : "Anomaly"}
      </button>
      <button
        type="button"
        onClick={stopTracking}
        disabled={!isTracked}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-500/[0.20] bg-slate-950/[0.35] px-3 text-xs font-medium text-slate-300 transition hover:border-red-300/[0.45] hover:text-red-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
      >
        <PauseCircle size={14} aria-hidden="true" />
        Stop
      </button>
    </div>
  );
}

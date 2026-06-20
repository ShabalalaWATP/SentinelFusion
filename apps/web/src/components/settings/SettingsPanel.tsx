import { FeedConfidenceControls } from "./FeedConfidenceControls";
import { ProviderStatusCard, type ProviderStatusView } from "./ProviderStatusCard";
import { useAircraftStore } from "../../stores/aircraftStore";
import { selectFeedConfidenceSettings, useFeedFilterStore } from "../../stores/feedFilterStore";
import { useVesselStore } from "../../stores/vesselStore";
import { describeFeedHealth } from "../../traffic/feedConfidence";
import { useNowTick } from "../../hooks/useNowTick";

export function SettingsPanel() {
  const vesselStatus = useVesselStore((state) => state.streamStatus);
  const vesselConnectionStatus = useVesselStore((state) => state.connectionStatus);
  const vesselLastError = useVesselStore((state) => state.lastError);
  const aircraftStatus = useAircraftStore((state) => state.streamStatus);
  const aircraftConnectionStatus = useAircraftStore((state) => state.connectionStatus);
  const aircraftLastError = useAircraftStore((state) => state.lastError);
  const feedSettings = useFeedFilterStore(selectFeedConfidenceSettings);
  const nowMs = useNowTick();

  return (
    <aside className="flex h-[18rem] w-full shrink-0 flex-col border-t border-slate-500/[0.15] bg-ocean-900/[0.96] shadow-panel lg:h-full lg:w-[24rem] lg:border-l lg:border-t-0">
      <div className="border-b border-slate-500/[0.15] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
          Settings
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-7 text-slate-50">
          Live feed controls
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="space-y-3">
          <FeedConfidenceControls />
          <ProviderStatusCard
            status={toSeaStatusView(
              vesselStatus,
              vesselConnectionStatus,
              vesselLastError,
              feedSettings.maxContactAgeMinutes,
              nowMs
            )}
          />
          <ProviderStatusCard
            status={toAirStatusView(
              aircraftStatus,
              aircraftConnectionStatus,
              aircraftLastError,
              feedSettings.maxContactAgeMinutes,
              nowMs
            )}
          />
        </div>
      </div>
    </aside>
  );
}

function toSeaStatusView(
  status: ReturnType<typeof useVesselStore.getState>["streamStatus"],
  connectionStatus: string,
  lastError: string | null,
  maxMessageAgeMinutes: number,
  nowMs: number
): ProviderStatusView {
  const health = describeFeedHealth({
    connectionStatus,
    lastError,
    maxMessageAgeMinutes,
    nowMs,
    streamStatus: status
  });

  return {
    connected: Boolean(status?.connected),
    connectionStatus,
    errors: status?.errors ?? 0,
    healthReason: health.reason,
    healthy: health.healthy,
    lastError,
    mode: status?.mode ?? "unknown",
    name: "AISstream sea feed",
    normalised: status?.messagesNormalised ?? 0,
    received: status?.messagesReceived ?? 0,
    reconnectAttempts: status?.reconnectAttempts ?? 0,
    state: status?.state ?? connectionStatus,
    ...(status?.lastMessageAt ? { lastMessageAt: status.lastMessageAt } : {}),
    ...(status?.dataLatencyMs !== undefined ? { latencyMs: status.dataLatencyMs } : {})
  };
}

function toAirStatusView(
  status: ReturnType<typeof useAircraftStore.getState>["streamStatus"],
  connectionStatus: string,
  lastError: string | null,
  maxMessageAgeMinutes: number,
  nowMs: number
): ProviderStatusView {
  const provider = status?.provider ? ` (${status.provider})` : "";
  const health = describeFeedHealth({
    connectionStatus,
    lastError,
    maxMessageAgeMinutes,
    nowMs,
    streamStatus: status
  });

  return {
    connected: Boolean(status?.connected),
    connectionStatus,
    errors: status?.errors ?? 0,
    healthReason: health.reason,
    healthy: health.healthy,
    lastError,
    mode: status?.mode ?? "unknown",
    name: `Aircraft feed${provider}`,
    normalised: status?.aircraftNormalised ?? 0,
    received: status?.aircraftReceived ?? 0,
    reconnectAttempts: status?.reconnectAttempts ?? 0,
    state: status?.state ?? connectionStatus,
    ...(status?.lastMessageAt ? { lastMessageAt: status.lastMessageAt } : {}),
    ...(status?.dataLatencyMs !== undefined ? { latencyMs: status.dataLatencyMs } : {})
  };
}

import { Anchor, Clock3, Compass, MapPin, Milestone, Plane, Route } from "lucide-react";
import type { ReactNode } from "react";
import { isMilitaryVessel, type Aircraft, type Vessel } from "@aisstream/shared";
import { useVisibleTraffic } from "../../hooks/useVisibleTraffic";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useVesselStore } from "../../stores/vesselStore";
import {
  formatDistanceNm,
  formatElapsedMinutes,
  getRouteMetrics,
  getTrackMetrics
} from "./routeMetrics";
import { selectRouteAircraft } from "./routeAircraft";
import { selectRouteVessels } from "./routeVessels";

type RoutePanelProps = {
  onInspectAircraft(id: string): void;
  onInspectVessel(id: string): void;
};

export function RoutePanel({ onInspectAircraft, onInspectVessel }: RoutePanelProps) {
  const { visibleAircraft, visibleVessels } = useVisibleTraffic();
  const selectedVesselId = useVesselStore((state) => state.selectedVesselId);
  const selectedAircraftId = useAircraftStore((state) => state.selectedAircraftId);
  const routeVessels = selectRouteVessels(visibleVessels, { selectedVesselId });
  const routeAircraft = selectRouteAircraft(visibleAircraft, { selectedAircraftId });
  const selectedRoute = routeVessels.find((vessel) => vessel.id === selectedVesselId) ?? null;
  const selectedAircraftRoute =
    routeAircraft.find((item) => item.id === selectedAircraftId) ?? null;
  const selectedRouteMetrics = selectedRoute ? getRouteMetrics(selectedRoute) : null;
  const selectedAircraftRouteMetrics = selectedAircraftRoute
    ? getTrackMetrics(selectedAircraftRoute.track)
    : null;
  const totalDistance = routeVessels.reduce(
    (total, vessel) => total + (getRouteMetrics(vessel)?.distanceNm ?? 0),
    0
  ) + routeAircraft.reduce(
    (total, item) => total + (getTrackMetrics(item.track)?.distanceNm ?? 0),
    0
  );

  return (
    <aside className="flex h-[18rem] w-full shrink-0 flex-col border-t border-slate-500/[0.15] bg-ocean-900/[0.96] shadow-panel lg:h-full lg:w-[22rem] lg:border-l lg:border-t-0">
      <div className="border-b border-slate-500/[0.15] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
          Track monitor
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-7 text-slate-50">
          Observed tracks
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Rebuilt from received AIS and flight positions.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-2">
          <RouteStat
            icon={<Route size={16} aria-hidden="true" />}
            label="Shown"
            value={routeVessels.length + routeAircraft.length}
          />
          <RouteStat
            icon={<Milestone size={16} aria-hidden="true" />}
            label="Distance"
            value={formatDistanceNm(totalDistance)}
          />
        </div>

        {selectedRoute && selectedRouteMetrics ? (
          <SelectedRouteCard vessel={selectedRoute} metrics={selectedRouteMetrics} />
        ) : null}
        {selectedAircraftRoute && selectedAircraftRouteMetrics ? (
          <SelectedAircraftRouteCard
            aircraft={selectedAircraftRoute}
            metrics={selectedAircraftRouteMetrics}
          />
        ) : null}

        <div className="mt-4 space-y-2">
          <RouteSectionTitle label="Observed AIS tracks" count={routeVessels.length} />
          {routeVessels.length > 0 ? (
            routeVessels.map((vessel) => {
              const metrics = getRouteMetrics(vessel);

              return (
                <button
                  key={vessel.id}
                  type="button"
                  onClick={() => onInspectVessel(vessel.id)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
                    selectedVesselId === vessel.id
                      ? "border-amber-300/[0.72] bg-amber-300/[0.12]"
                      : "border-slate-500/[0.16] bg-slate-950/[0.30] hover:border-cyan-300/[0.35]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-100">
                      {vessel.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {metrics ? formatDistanceNm(metrics.distanceNm) : "Track"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Anchor size={13} aria-hidden="true" />
                    <span className="truncate">{vessel.destination ?? vessel.shipType}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <span>{vessel.speedOverGround.toFixed(1)} kn</span>
                    <span>{metrics?.pointCount ?? vessel.track.length} pts</span>
                    <span>{metrics ? formatElapsedMinutes(metrics.elapsedMinutes) : "Live"}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              No multi-point AIS tracks are currently available.
            </p>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <RouteSectionTitle label="Observed flight tracks" count={routeAircraft.length} />
          {routeAircraft.length > 0 ? (
            routeAircraft.map((item) => {
              const metrics = getTrackMetrics(item.track);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInspectAircraft(item.id)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300/[0.28] ${
                    selectedAircraftId === item.id
                      ? "border-amber-300/[0.72] bg-amber-300/[0.12]"
                      : "border-slate-500/[0.16] bg-slate-950/[0.30] hover:border-cyan-300/[0.35]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-100">
                      {aircraftLabel(item)}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {metrics ? formatDistanceNm(metrics.distanceNm) : "Track"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Plane size={13} aria-hidden="true" />
                    <span className="truncate">{item.aircraftType ?? item.classification}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <span>{item.groundSpeedKt ? `${item.groundSpeedKt.toFixed(0)} kt` : "Speed"}</span>
                    <span>{metrics?.pointCount ?? item.track.length} pts</span>
                    <span>{metrics ? formatElapsedMinutes(metrics.elapsedMinutes) : "Live"}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              No multi-point flight tracks are currently available.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function RouteSectionTitle({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <span className="text-xs text-slate-500">{count.toLocaleString("en-GB")}</span>
    </div>
  );
}

function RouteStat({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] px-3 py-3">
      <div className="flex items-center gap-2 text-cyan-100">{icon}</div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function SelectedRouteCard({
  metrics,
  vessel
}: {
  metrics: NonNullable<ReturnType<typeof getRouteMetrics>>;
  vessel: Vessel;
}) {
  return (
    <section className="mt-4 rounded-md border border-amber-300/[0.24] bg-amber-300/[0.08] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-normal text-amber-100">
            Selected track
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-50">{vessel.name}</h3>
        </div>
        {isMilitaryVessel(vessel) ? (
          <span className="shrink-0 rounded bg-violet-300/[0.16] px-2 py-1 text-[10px] font-semibold uppercase text-violet-100">
            Military
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <RouteDatum icon={<Route size={14} aria-hidden="true" />} label="Distance" value={formatDistanceNm(metrics.distanceNm)} />
        <RouteDatum icon={<Clock3 size={14} aria-hidden="true" />} label="Elapsed" value={formatElapsedMinutes(metrics.elapsedMinutes)} />
        <RouteDatum icon={<Milestone size={14} aria-hidden="true" />} label="Points" value={metrics.pointCount.toString()} />
        <RouteDatum icon={<Compass size={14} aria-hidden="true" />} label="Course" value={`${Math.round(vessel.courseOverGround)} deg`} />
      </dl>

      <div className="mt-3 space-y-2 text-xs text-slate-400">
        <PositionRow label="Start" point={metrics.start} />
        <PositionRow label="Latest" point={metrics.end} />
      </div>
    </section>
  );
}

function SelectedAircraftRouteCard({
  aircraft,
  metrics
}: {
  aircraft: Aircraft;
  metrics: NonNullable<ReturnType<typeof getTrackMetrics<Aircraft["track"][number]>>>;
}) {
  return (
    <section className="mt-4 rounded-md border border-amber-300/[0.24] bg-amber-300/[0.08] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-normal text-amber-100">
            Selected flight track
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-50">
            {aircraftLabel(aircraft)}
          </h3>
        </div>
        <span className="shrink-0 rounded bg-sky-300/[0.16] px-2 py-1 text-[10px] font-semibold uppercase text-sky-100">
          {aircraft.classification}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <RouteDatum icon={<Route size={14} aria-hidden="true" />} label="Distance" value={formatDistanceNm(metrics.distanceNm)} />
        <RouteDatum icon={<Clock3 size={14} aria-hidden="true" />} label="Elapsed" value={formatElapsedMinutes(metrics.elapsedMinutes)} />
        <RouteDatum icon={<Milestone size={14} aria-hidden="true" />} label="Points" value={metrics.pointCount.toString()} />
        <RouteDatum icon={<Compass size={14} aria-hidden="true" />} label="Track" value={formatTrack(aircraft.trackDegrees)} />
      </dl>

      <div className="mt-3 space-y-2 text-xs text-slate-400">
        <PositionRow label="Start" point={metrics.start} />
        <PositionRow label="Latest" point={metrics.end} />
      </div>
    </section>
  );
}

function RouteDatum({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-slate-950/[0.36] p-2">
      <div className="flex items-center gap-2 text-amber-100">{icon}</div>
      <dt className="mt-1 text-[10px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-slate-50">{value}</dd>
    </div>
  );
}

function PositionRow({
  label,
  point
}: {
  label: string;
  point: { latitude: number; longitude: number; timestamp: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-950/[0.24] px-2.5 py-2">
      <span className="inline-flex items-center gap-2 font-medium text-slate-300">
        <MapPin size={13} aria-hidden="true" />
        {label}
      </span>
      <span className="truncate text-right">
        {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)} · {formatTime(point.timestamp)}
      </span>
    </div>
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

function formatTrack(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Math.round(value)} deg`;
}

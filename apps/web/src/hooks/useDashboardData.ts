import { useEffect } from "react";
import { apiClient } from "../api/apiClient";
import { flightRealtimeClient } from "../realtime/flightRealtimeClient";
import { realtimeClient } from "../realtime/realtimeClient";
import { useAircraftStore } from "../stores/aircraftStore";
import { useVesselStore } from "../stores/vesselStore";

export function useDashboardData(): void {
  useEffect(() => {
    let isMounted = true;
    const vesselStore = useVesselStore.getState();
    const aircraftStore = useAircraftStore.getState();
    const {
      applyEnvelope,
      setConnectionStatus,
      setError,
      setStreamStatus,
      setSnapshot
    } = vesselStore;
    const {
      applyEnvelope: applyAircraftEnvelope,
      setConnectionStatus: setAircraftConnectionStatus,
      setError: setAircraftError,
      setStreamStatus: setAircraftStreamStatus,
      setSnapshot: setAircraftSnapshot
    } = aircraftStore;

    apiClient
      .getVessels()
      .then((snapshot) => {
        if (isMounted) {
          setSnapshot(snapshot.vessels, snapshot.metrics, snapshot.stream);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Initial vessel load failed";
        setError(message);
      });

    apiClient
      .getAircraft()
      .then((snapshot) => {
        if (isMounted) {
          setAircraftSnapshot(snapshot.aircraft, snapshot.metrics, snapshot.stream);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Initial aircraft load failed";
        setAircraftError(message);
      });

    const disconnectVessels = realtimeClient.connect({
      onMessage: applyEnvelope,
      onStatus(status) {
        setConnectionStatus(status);
        if (status === "open") {
          setError(null);
        }
      },
      onError(error) {
        setError(error.message);
      }
    });

    const disconnectAircraft = flightRealtimeClient.connect({
      onMessage: applyAircraftEnvelope,
      onStatus(status) {
        setAircraftConnectionStatus(status);
        if (status === "open") {
          setAircraftError(null);
        }
      },
      onError(error) {
        setAircraftError(error.message);
      }
    });

    const refreshFeedStatuses = (): void => {
      void apiClient
        .getStreamStatus()
        .then((status) => {
          if (isMounted) {
            setStreamStatus(status);
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Vessel stream status failed";
          setError(message);
        });

      void apiClient
        .getFlightStatus()
        .then((status) => {
          if (isMounted) {
            setAircraftStreamStatus(status);
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Flight stream status failed";
          setAircraftError(message);
        });
    };

    refreshFeedStatuses();
    const feedStatusTimer = window.setInterval(refreshFeedStatuses, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(feedStatusTimer);
      disconnectVessels();
      disconnectAircraft();
    };
  }, []);
}

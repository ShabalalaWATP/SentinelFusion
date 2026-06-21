import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AisStreamStatus, FlightStreamStatus } from "@aisstream/shared";
import { useAircraftStore } from "../../stores/aircraftStore";
import { useAnalysisAccessStore } from "../../stores/analysisAccessStore";
import { useFeedFilterStore } from "../../stores/feedFilterStore";
import { useVesselStore } from "../../stores/vesselStore";
import { SettingsPanel } from "./SettingsPanel";

const timestamp = new Date().toISOString();

const seaStatus: AisStreamStatus = {
  mode: "live",
  state: "subscribed",
  connected: true,
  messagesReceived: 100,
  messagesNormalised: 98,
  messagesDropped: 2,
  errors: 0,
  reconnectAttempts: 1,
  lastMessageAt: timestamp,
  dataLatencyMs: 250,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]],
    filterMessageTypes: ["PositionReport"],
    filtersShipMMSI: []
  }
};

const airStatus: FlightStreamStatus = {
  mode: "live",
  provider: "opensky",
  state: "error",
  connected: false,
  aircraftReceived: 12,
  aircraftNormalised: 10,
  aircraftDropped: 2,
  errors: 1,
  reconnectAttempts: 3,
  lastError: "OpenSky returned HTTP 429",
  lastMessageAt: timestamp,
  subscription: {
    boundingBoxes: [[[-90, -180], [90, 180]]]
  }
};

describe("SettingsPanel", () => {
  beforeEach(() => {
    cleanup();
    window.sessionStorage.clear();
    useAnalysisAccessStore.getState().clearToken();
    useFeedFilterStore.getState().resetSettings();
    useVesselStore.setState({
      connectionStatus: "open",
      lastError: null,
      streamStatus: seaStatus
    });
    useAircraftStore.setState({
      connectionStatus: "error",
      lastError: airStatus.lastError ?? null,
      streamStatus: airStatus
    });
  });

  it("shows provider status and updates feed confidence controls", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("AISstream sea feed")).toBeTruthy();
    expect(screen.getByText("Aircraft feed (opensky)")).toBeTruthy();
    expect(screen.getByText("OpenSky returned HTTP 429")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: /Hide stale contacts/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Hide unhealthy feeds/i }));

    expect(useFeedFilterStore.getState().settings.hideStaleContacts).toBe(true);
    expect(useFeedFilterStore.getState().settings.hideUnhealthyFeeds).toBe(true);
  });

  it("does not mark an open provider healthy before telemetry arrives", () => {
    const streamWithoutMessages = { ...seaStatus };
    delete streamWithoutMessages.lastMessageAt;

    useVesselStore.setState({
      connectionStatus: "open",
      lastError: null,
      streamStatus: {
        ...streamWithoutMessages,
        messagesNormalised: 0,
        messagesReceived: 0
      }
    });

    render(<SettingsPanel />);

    expect(screen.getByText("No telemetry has been received yet.")).toBeTruthy();
  });

  it("stores the protected API token for the browser session", () => {
    render(<SettingsPanel />);

    fireEvent.change(screen.getByPlaceholderText("Paste local API token"), {
      target: { value: " local-token " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save token" }));

    expect(useAnalysisAccessStore.getState().token).toBe("local-token");
    expect(window.sessionStorage.getItem("aisstream.analysisAccessToken.v1")).toBe(
      "local-token"
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(useAnalysisAccessStore.getState().token).toBe("");
    expect(window.sessionStorage.getItem("aisstream.analysisAccessToken.v1")).toBeNull();
  });
});

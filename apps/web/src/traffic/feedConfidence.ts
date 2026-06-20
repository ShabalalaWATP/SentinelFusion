import type { Aircraft, Vessel } from "@aisstream/shared";

export type FeedConfidenceSettings = {
  hideStaleContacts: boolean;
  hideUnhealthyFeeds: boolean;
  maxContactAgeMinutes: number;
};

export type FeedHealthSnapshot = {
  aircraftHealthy: boolean;
  nowMs?: number;
  vesselsHealthy: boolean;
};

export type FeedStreamStatus = {
  aircraftNormalised?: number | undefined;
  aircraftReceived?: number | undefined;
  connected: boolean;
  lastMessageAt?: string | undefined;
  messagesNormalised?: number | undefined;
  messagesReceived?: number | undefined;
  state?: string | undefined;
};

export type FeedHealthCheck = {
  connectionStatus: string;
  lastError: string | null;
  maxMessageAgeMinutes: number;
  nowMs?: number;
  streamStatus: FeedStreamStatus | null | undefined;
};

export type FeedHealthResult = {
  healthy: boolean;
  reason: string;
};

export type FeedConfidenceOptions = {
  feedHealth?: FeedHealthSnapshot;
  selectedAircraftId?: string | null;
  selectedVesselId?: string | null;
  settings: FeedConfidenceSettings;
};

export const defaultFeedConfidenceSettings: FeedConfidenceSettings = {
  hideStaleContacts: false,
  hideUnhealthyFeeds: false,
  maxContactAgeMinutes: 10
};

export function filterByFeedConfidence(
  vessels: Vessel[],
  aircraft: Aircraft[],
  options: FeedConfidenceOptions
): { aircraft: Aircraft[]; vessels: Vessel[] } {
  return {
    vessels: filterVesselsByConfidence(vessels, options),
    aircraft: filterAircraftByConfidence(aircraft, options)
  };
}

export function countActiveFeedConfidenceFilters(settings: FeedConfidenceSettings): number {
  return [settings.hideStaleContacts, settings.hideUnhealthyFeeds].filter(Boolean).length;
}

export function isFeedHealthy(input: FeedHealthCheck): boolean {
  return describeFeedHealth(input).healthy;
}

export function describeFeedHealth({
  connectionStatus,
  lastError,
  maxMessageAgeMinutes,
  nowMs = Date.now(),
  streamStatus
}: FeedHealthCheck): FeedHealthResult {
  if (connectionStatus !== "open") {
    return { healthy: false, reason: `Connection is ${connectionStatus}.` };
  }

  if (!streamStatus) {
    return { healthy: false, reason: "No provider status has been received yet." };
  }

  if (!streamStatus.connected) {
    return { healthy: false, reason: "Provider stream is not connected." };
  }

  if (streamStatus.state !== "subscribed") {
    return { healthy: false, reason: `Provider stream is ${streamStatus.state ?? "unknown"}.` };
  }

  if (lastError) {
    return { healthy: false, reason: `Provider error: ${lastError}` };
  }

  const received = streamStatus.messagesReceived ?? streamStatus.aircraftReceived ?? 0;
  const normalised = streamStatus.messagesNormalised ?? streamStatus.aircraftNormalised ?? 0;

  if (received < 1) {
    return { healthy: false, reason: "No telemetry has been received yet." };
  }

  if (normalised < 1) {
    return { healthy: false, reason: "No usable telemetry has been normalised yet." };
  }

  if (!streamStatus.lastMessageAt) {
    return { healthy: false, reason: "No telemetry timestamp has been received yet." };
  }

  const lastMessageAtMs = Date.parse(streamStatus.lastMessageAt);

  if (Number.isNaN(lastMessageAtMs)) {
    return { healthy: false, reason: "Telemetry timestamp is invalid." };
  }

  const maxAgeMs = maxMessageAgeMinutes * 60_000;
  const messageAgeMs = nowMs - lastMessageAtMs;

  if (messageAgeMs > maxAgeMs) {
    const ageMinutes = Math.ceil(messageAgeMs / 60_000);
    return { healthy: false, reason: `Last telemetry is ${ageMinutes} minutes old.` };
  }

  return { healthy: true, reason: "Fresh telemetry received." };
}

export function isContactStale(
  contact: { lastUpdated: string },
  maxAgeMinutes: number,
  nowMs: number = Date.now()
): boolean {
  const updatedAt = Date.parse(contact.lastUpdated);

  if (Number.isNaN(updatedAt)) {
    return true;
  }

  return nowMs - updatedAt > maxAgeMinutes * 60_000;
}

function filterVesselsByConfidence(
  vessels: Vessel[],
  options: FeedConfidenceOptions
): Vessel[] {
  if (options.settings.hideUnhealthyFeeds && options.feedHealth?.vesselsHealthy === false) {
    return [];
  }

  const filtered = filterStaleContacts(vessels, options);
  return preserveSelected(filtered, vessels, options.selectedVesselId);
}

function filterAircraftByConfidence(
  aircraft: Aircraft[],
  options: FeedConfidenceOptions
): Aircraft[] {
  if (options.settings.hideUnhealthyFeeds && options.feedHealth?.aircraftHealthy === false) {
    return [];
  }

  const filtered = filterStaleContacts(aircraft, options);
  return preserveSelected(filtered, aircraft, options.selectedAircraftId);
}

function filterStaleContacts<T extends { lastUpdated: string }>(
  contacts: T[],
  options: FeedConfidenceOptions
): T[] {
  if (!options.settings.hideStaleContacts) {
    return contacts;
  }

  const nowMs = options.feedHealth?.nowMs ?? Date.now();
  return contacts.filter(
    (contact) => !isContactStale(contact, options.settings.maxContactAgeMinutes, nowMs)
  );
}

function preserveSelected<T extends { id: string }>(
  filtered: T[],
  source: T[],
  selectedId: string | null | undefined
): T[] {
  if (!selectedId || filtered.some((item) => item.id === selectedId)) {
    return filtered;
  }

  const selected = source.find((item) => item.id === selectedId);
  return selected ? [...filtered, selected] : filtered;
}

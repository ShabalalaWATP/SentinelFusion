const alertPresetIds = [
  "highRiskVessels",
  "classifiedVessels",
  "aircraftEmergencies",
  "classifiedAircraft",
  "watchRules",
  "anomalies",
  "providerHealth",
  "staleContacts"
] as const;

export type AlertPresetId = (typeof alertPresetIds)[number];
export type AlertPresetSettings = Record<AlertPresetId, boolean>;

export type AlertPresetDefinition = {
  id: AlertPresetId;
  label: string;
  description: string;
};

export const alertPresetDefinitions: AlertPresetDefinition[] = [
  {
    id: "highRiskVessels",
    label: "High-risk vessels",
    description: "AIS contacts currently marked as high risk."
  },
  {
    id: "classifiedVessels",
    label: "Military and government vessels",
    description: "Vessels classified from AIS identity fields."
  },
  {
    id: "aircraftEmergencies",
    label: "Aircraft emergencies",
    description: "Aircraft reporting emergency squawks or emergency state."
  },
  {
    id: "classifiedAircraft",
    label: "Military and classified aircraft",
    description: "Aircraft classified from ADS-B identity fields."
  },
  {
    id: "watchRules",
    label: "Watched areas",
    description: "Entries and exits from saved natural-language watch rules."
  },
  {
    id: "anomalies",
    label: "Movement anomalies",
    description: "Unusual behaviour from active area and entity monitors."
  },
  {
    id: "providerHealth",
    label: "Provider health",
    description: "Sea or air feeds reporting degraded connectivity."
  },
  {
    id: "staleContacts",
    label: "Stale contacts",
    description: "Contacts older than the feed confidence threshold."
  }
];

export const defaultAlertPresetSettings: AlertPresetSettings = {
  highRiskVessels: true,
  classifiedVessels: true,
  aircraftEmergencies: true,
  classifiedAircraft: true,
  watchRules: true,
  anomalies: true,
  providerHealth: true,
  staleContacts: false
};

export function countEnabledAlertPresets(settings: AlertPresetSettings): number {
  return alertPresetIds.filter((id) => settings[id]).length;
}

export function isAlertPresetSettings(value: unknown): value is AlertPresetSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return alertPresetIds.every((id) => typeof candidate[id] === "boolean");
}

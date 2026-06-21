import type { SatelliteContextResponse, TrafficAreaBounds } from "@aisstream/shared";
import type { AppConfig } from "../config/environment";

const gibsBaseUrl = "https://gibs.earthdata.nasa.gov";
const gibsDocsUrl = "https://nasa-gibs.github.io/gibs-api-docs/";
const imageFormat = "image/jpeg";

function satelliteProviderSource(
  provider: AppConfig["satelliteContextProvider"]
): SatelliteContextResponse["source"] {
  if (provider === "custom") {
    return {
      title: "Licensed satellite imagery provider",
      url: gibsDocsUrl,
      attribution: "Satellite imagery requires a configured server-side provider adapter"
    };
  }

  return {
    title: "NASA GIBS imagery",
    url: gibsDocsUrl,
    attribution: "Satellite imagery by NASA Global Imagery Browse Services"
  };
}

export function notConfiguredSatelliteContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  mode: SatelliteContextResponse["mode"],
  provider: AppConfig["satelliteContextProvider"]
): SatelliteContextResponse {
  return {
    status: "not_configured",
    mode,
    provider,
    source: satelliteProviderSource(provider),
    generatedAt,
    cached: false,
    area,
    limitations: [
      "Satellite snapshot provider access is not configured for this deployment.",
      "Use NASA GIBS live mode or a licensed provider adapter before presenting satellite imagery."
    ],
    error: "Satellite snapshot provider is not configured."
  };
}

export function providerErrorSatelliteContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  mode: SatelliteContextResponse["mode"],
  provider: AppConfig["satelliteContextProvider"],
  error: string
): SatelliteContextResponse {
  return {
    status: "error",
    mode,
    provider,
    source: satelliteProviderSource(provider),
    generatedAt,
    cached: false,
    area,
    limitations: ["Satellite snapshot context is unavailable for this area."],
    error
  };
}

export function liveNasaGibsSatelliteContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  config: AppConfig
): SatelliteContextResponse {
  const acquiredDate = snapshotDate(generatedAt, config.satelliteContextDateOffsetDays);
  const imageUrl = buildGibsWmsUrl(area, config.satelliteContextLayer, acquiredDate, config.satelliteContextImageSize);

  return {
    status: "ok",
    mode: "live",
    provider: "nasa-gibs",
    source: satelliteProviderSource("nasa-gibs"),
    generatedAt,
    cached: false,
    area,
    snapshot: {
      id: snapshotId(area, config.satelliteContextLayer, acquiredDate),
      title: layerTitle(config.satelliteContextLayer),
      layerId: config.satelliteContextLayer,
      imageUrl: imageUrl.toString(),
      acquiredDate,
      format: imageFormat,
      width: config.satelliteContextImageSize,
      height: config.satelliteContextImageSize,
      projection: "EPSG:4326",
      area
    },
    limitations: [
      "NASA GIBS browse imagery is contextual and can be affected by cloud, sensor availability, processing delay, and day/night coverage.",
      "This snapshot is not a navigational chart or a substitute for authoritative satellite intelligence."
    ]
  };
}

export function mockSatelliteContext(
  area: TrafficAreaBounds,
  generatedAt: string,
  imageSize: number
): SatelliteContextResponse {
  const acquiredDate = snapshotDate(generatedAt, 1);

  return {
    status: "ok",
    mode: "mock",
    provider: "mock",
    source: {
      ...satelliteProviderSource("nasa-gibs"),
      title: "Mock satellite snapshot",
      attribution: "Mock satellite snapshot for local development"
    },
    generatedAt,
    cached: false,
    area,
    snapshot: {
      id: snapshotId(area, "mock-satellite-snapshot", acquiredDate),
      title: "Mock satellite snapshot",
      layerId: "mock-satellite-snapshot",
      acquiredDate,
      format: imageFormat,
      width: imageSize,
      height: imageSize,
      projection: "EPSG:4326",
      area
    },
    limitations: [
      "Mock satellite snapshots are for offline UI development only and are not live imagery."
    ]
  };
}

function buildGibsWmsUrl(
  area: TrafficAreaBounds,
  layerId: string,
  acquiredDate: string,
  imageSize: number
): URL {
  const url = new URL("/wms/epsg4326/best/wms.cgi", gibsBaseUrl);
  url.search = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    FORMAT: imageFormat,
    TRANSPARENT: "false",
    LAYERS: layerId,
    STYLES: "",
    WIDTH: String(imageSize),
    HEIGHT: String(imageSize),
    CRS: "EPSG:4326",
    BBOX: [area.south, area.west, area.north, area.east].map((value) => value.toFixed(5)).join(","),
    TIME: acquiredDate
  }).toString();

  return url;
}

function snapshotDate(generatedAt: string, offsetDays: number): string {
  const date = new Date(generatedAt);
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return date.toISOString().slice(0, 10);
}

function snapshotId(area: TrafficAreaBounds, layerId: string, acquiredDate: string): string {
  return [
    "satellite",
    layerId,
    acquiredDate,
    area.south.toFixed(3),
    area.west.toFixed(3),
    area.north.toFixed(3),
    area.east.toFixed(3)
  ].join(":");
}

function layerTitle(layerId: string): string {
  return layerId.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

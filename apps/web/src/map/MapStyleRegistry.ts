import type { MapProjection, MapStyleId } from "@aisstream/shared";
import type { RasterLayerSpecification, StyleSpecification } from "maplibre-gl";
import type {
  IMapStyleProvider,
  MapProjectionDefinition,
  MapStyleDefinition
} from "./IMapStyleProvider";

const rasterLayer = (id: string, source: string, opacity = 1): RasterLayerSpecification => ({
  id,
  type: "raster",
  source,
  paint: {
    "raster-opacity": opacity
  }
});

const rasterStyle = (
  name: string,
  background: string,
  sources: StyleSpecification["sources"],
  layers: RasterLayerSpecification[]
): StyleSpecification => ({
  version: 8,
  name,
  sources,
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": background
      }
    },
    ...layers
  ]
});

const styles: MapStyleDefinition[] = [
  {
    id: "dark",
    label: "Dark",
    description: "Dark operational basemap.",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
  },
  {
    id: "light",
    label: "Light",
    description: "Light chart review basemap.",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  },
  {
    id: "streets",
    label: "Streets",
    description: "Street and port infrastructure context.",
    style: "https://demotiles.maplibre.org/style.json"
  },
  {
    id: "satellite",
    label: "Satellite",
    description: "Satellite imagery context.",
    style: rasterStyle(
      "Satellite",
      "#061018",
      {
        imagery: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          attribution: "Tiles © Esri"
        }
      },
      [rasterLayer("imagery", "imagery")]
    )
  },
  {
    id: "satellite-hybrid",
    label: "Hybrid",
    description: "Satellite imagery with reference labels where available.",
    style: rasterStyle(
      "Satellite hybrid",
      "#061018",
      {
        imagery: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          attribution: "Tiles © Esri"
        },
        reference: {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          attribution: "Reference © Esri"
        }
      },
      [rasterLayer("imagery", "imagery"), rasterLayer("reference", "reference", 0.9)]
    )
  },
  {
    id: "terrain",
    label: "Terrain",
    description: "Topographic context for coastline and approaches.",
    style: rasterStyle(
      "Terrain",
      "#0b1418",
      {
        terrain: {
          type: "raster",
          tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "Map data © OpenStreetMap contributors, SRTM | Style © OpenTopoMap"
        }
      },
      [rasterLayer("terrain", "terrain")]
    )
  },
  {
    id: "outdoor",
    label: "Outdoor",
    description: "Outdoor-style coastal and harbour context.",
    style: rasterStyle(
      "Outdoor",
      "#eef2f7",
      {
        outdoor: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      [rasterLayer("outdoor", "outdoor")]
    )
  }
];

const projections: MapProjectionDefinition[] = [
  {
    id: "mercator",
    label: "Mercator",
    description: "2D Mercator chart projection."
  },
  {
    id: "globe",
    label: "Globe",
    description: "3D globe projection where supported."
  }
];

export class MapStyleRegistry implements IMapStyleProvider {
  listStyles(): MapStyleDefinition[] {
    return styles;
  }

  getStyle(id: MapStyleId): string | StyleSpecification {
    return styles.find((style) => style.id === id)?.style ?? styles[0]!.style;
  }

  listProjections(): MapProjectionDefinition[] {
    return projections;
  }
}

export const mapStyleRegistry = new MapStyleRegistry();

export const isKnownProjection = (projection: string): projection is MapProjection =>
  projections.some((candidate) => candidate.id === projection);

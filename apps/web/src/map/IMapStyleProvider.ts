import type { MapProjection, MapStyleId } from "@aisstream/shared";
import type { StyleSpecification } from "maplibre-gl";

export type MapStyleDefinition = {
  id: MapStyleId;
  label: string;
  description: string;
  style: string | StyleSpecification;
};

export type MapProjectionDefinition = {
  id: MapProjection;
  label: string;
  description: string;
};

export interface IMapStyleProvider {
  listStyles(): MapStyleDefinition[];
  getStyle(id: MapStyleId): string | StyleSpecification;
  listProjections(): MapProjectionDefinition[];
}

// OpenLayers 2D 地图封装：按图层名管理，支持显隐/删除/WMS叠加/PNG导出
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import ImageWMS from "ol/source/ImageWMS";
import ImageLayer from "ol/layer/Image";
import { fromLonLat } from "ol/proj";
import GeoJSONFormat from "ol/format/GeoJSON";
import { Fill, Stroke, Style } from "ol/style";

export interface OlHandle {
  map: OlMap;
  addLayer(name: string, geojson: GeoJSON.GeoJsonObject): void;
  setLayerVisible(name: string, visible: boolean): void;
  removeLayer(name: string): void;
  clear(): void;
  resize(): void;
  flyToLonLat(lng: number, lat: number, zoom?: number): void;
  addWms(name: string, url: string): void;
  removeWms(name: string): void;
  exportPng(): void;
  zoomToLayer(geojson: GeoJSON.GeoJsonObject): void;
}

const PALETTE = ["#2ecc71", "#4f8ef7", "#e74c3c", "#f39c12", "#9b59b6", "#1abc9c"];
const wmsLayers = new Map<string, ImageLayer<ImageWMS>>();

export function createOlMap(container: HTMLElement): OlHandle {
  const map = new OlMap({
    target: container,
    // CartoDB light 底图（带 CORS 头，PNG 导出 canvas 才不被污染）
    layers: [
      new TileLayer({
        source: new XYZ({
          url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          crossOrigin: "anonymous",
          attributions: ['&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'],
        }),
      }),
    ],
    view: new View({ center: fromLonLat([116.4, 39.9]), zoom: 5 }),
    controls: [],
  });

  const layers = new Map<string, VectorLayer<VectorSource>>();

  return {
    map,

    addLayer(name, geojson) {
      const features = new GeoJSONFormat().readFeatures(geojson, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      const color = PALETTE[layers.size % PALETTE.length];
      const layer = new VectorLayer({
        source: new VectorSource({ features }),
        style: new Style({
          stroke: new Stroke({ color, width: 2.5 }),
          fill: new Fill({ color: color + "55" }),
        }),
      });
      map.addLayer(layer);
      layers.set(name, layer);
      const extent = layer.getSource()?.getExtent();
      if (extent) map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 14 });
    },

    setLayerVisible(name, visible) {
      const layer = layers.get(name);
      if (layer) layer.setVisible(visible);
    },

    removeLayer(name) {
      const layer = layers.get(name);
      if (layer) {
        map.removeLayer(layer);
        layers.delete(name);
      }
    },

    clear() {
      for (const name of [...layers.keys()]) this.removeLayer(name);
    },

    resize() {
      map.updateSize();
    },

    flyToLonLat(lng, lat, zoom = 5) {
      map.getView().animate({ center: fromLonLat([lng, lat]), zoom });
    },

    zoomToLayer(geojson) {
      const features = new GeoJSONFormat().readFeatures(geojson, {
        dataProjection: "EPSG:4326", featureProjection: "EPSG:3857",
      });
      if (features.length === 0) return;
      const src = new VectorSource({ features });
      const extent = src.getExtent();
      if (extent && isFinite(extent[0])) {
        map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 16, duration: 800 });
      }
    },

    addWms(name, url) {
      const existing = wmsLayers.get(name);
      if (existing) map.removeLayer(existing);
      const layer = new ImageLayer({
        source: new ImageWMS({
          url,
          params: { LAYERS: `mywebgis:${name}`, TILED: false },
          serverType: "geoserver",
          crossOrigin: "anonymous",
        }),
      });
      map.addLayer(layer);
      wmsLayers.set(name, layer);
    },

    removeWms(name) {
      const layer = wmsLayers.get(name);
      if (layer) {
        map.removeLayer(layer);
        wmsLayers.delete(name);
      }
    },

    exportPng() {
      map.once("rendercomplete", () => {
        const canvas = map.getViewport().querySelector("canvas");
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `webgis-export-${Date.now()}.png`;
        a.click();
      });
      map.renderSync();
    },
  };
}


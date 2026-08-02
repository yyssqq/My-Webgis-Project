// Cesium 3D 球体封装：按图层名管理，支持显隐/删除
// Cesium 静态资源在 public/cesium/（postinstall 从 node_modules 复制），加载前必须设置 CESIUM_BASE_URL。
window.CESIUM_BASE_URL = "/cesium/";

import {
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  GeoJsonDataSource,
  Math as CesiumMath,
  Viewer,
} from "cesium";

export interface CesiumHandle {
  viewer: Viewer;
  addLayer(name: string, geojson: GeoJSON.GeoJsonObject): void;
  setLayerVisible(name: string, visible: boolean): void;
  removeLayer(name: string): void;
  clear(): void;
  resize(): void;
  flyToLonLat(lng: number, lat: number, height?: number): void;
}

const PALETTE = ["#2ecc71", "#4f8ef7", "#e74c3c", "#f39c12", "#9b59b6", "#1abc9c"];
const dataSources = new Map<string, GeoJsonDataSource>();

export function createCesiumViewer(container: HTMLElement): CesiumHandle {
  const viewer = new Viewer(container, {
    terrainProvider: new EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
  });
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(116.4, 28, 10000000),
    orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
  });

  return {
    viewer,

    addLayer(name, geojson) {
      const ds = new GeoJsonDataSource();
      const color = Color.fromCssColorString(PALETTE[dataSources.size % PALETTE.length]);
      ds.load(geojson, {
        stroke: color,
        fill: color.withAlpha(0.4),
        strokeWidth: 2.5,
      }).then(() => {
        viewer.dataSources.add(ds);
        dataSources.set(name, ds);
        viewer.flyTo(ds, { duration: 1.2 });
      });
    },

    setLayerVisible(name, visible) {
      const ds = dataSources.get(name);
      if (ds) ds.show = visible;
    },

    removeLayer(name) {
      const ds = dataSources.get(name);
      if (ds) {
        viewer.dataSources.remove(ds);
        dataSources.delete(name);
      }
    },

    clear() {
      for (const name of [...dataSources.keys()]) this.removeLayer(name);
    },

    resize() {
      viewer.resize();
    },

    flyToLonLat(lng, lat, height = 100000) {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lng, lat, height),
        orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      });
    },
  };
}

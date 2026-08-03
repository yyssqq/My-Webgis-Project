/**
 * 工具内部共享的小工具函数（非注册工具）
 */
const turf = require("@turf/turf");

/** 任意 GeoJSON 统一转成 FeatureCollection */
function toFeatureCollection(geojson) {
  if (!geojson) throw new Error("缺少图层数据");
  if (geojson.type === "FeatureCollection") return geojson;
  if (geojson.type === "Feature") return { type: "FeatureCollection", features: [geojson] };
  return { type: "FeatureCollection", features: [turf.feature(geojson)] };
}

/** 取第一个要素（overlay 类工具按单要素处理） */
function toFeature(geojson) {
  const fc = toFeatureCollection(geojson);
  if (fc.features.length === 0) throw new Error("图层没有要素");
  return fc.features[0];
}

function countFeatures(geojson) {
  if (!geojson) return 0;
  return geojson.type === "FeatureCollection" ? geojson.features.length : 1;
}

module.exports = { toFeatureCollection, toFeature, countFeatures };

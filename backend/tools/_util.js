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

/** 取第一个要素（单要素场景：buffer 中心点等） */
function toFeature(geojson) {
  const fc = toFeatureCollection(geojson);
  if (fc.features.length === 0) throw new Error("图层没有要素");
  return fc.features[0];
}

/** 返回全部要素数组（多要素场景：overlay 工具遍历用） */
function toFeatures(geojson) {
  const fc = toFeatureCollection(geojson);
  if (fc.features.length === 0) throw new Error("图层没有要素");
  return fc.features;
}

/**
 * 对两个图层的所有要素做配对操作
 * @param {Function} op  (a, b) => Feature | null
 * @returns {Feature[]} 所有非空结果
 */
function pairwiseOverlay(geojsonA, geojsonB, op) {
  const featuresA = toFeatures(geojsonA);
  const featuresB = toFeatures(geojsonB);
  const results = [];
  for (const a of featuresA) {
    for (const b of featuresB) {
      try {
        const r = op(a, b);
        if (r) results.push(r);
      } catch {
        // 单对失败不影响其他配对
      }
    }
  }
  return results;
}

function countFeatures(geojson) {
  if (!geojson) return 0;
  return geojson.type === "FeatureCollection" ? geojson.features.length : 1;
}

module.exports = { toFeatureCollection, toFeature, toFeatures, pairwiseOverlay, countFeatures };

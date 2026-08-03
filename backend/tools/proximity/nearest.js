const turf = require("@turf/turf");
const { toFeatureCollection, toFeature } = require("../_util");

function normalizeTarget(target) {
  if (Array.isArray(target) && target.length >= 2) return turf.point([target[0], target[1]]);
  if (target && typeof target === "object") {
    if (target.lng != null && target.lat != null) return turf.point([target.lng, target.lat]);
    if (target.geometry || target.type) {
      return turf.point(turf.getCoord(toFeature(target)));
    }
  }
  throw new Error("target 需要是 {lng, lat} 或点图层");
}

function execute(params) {
  const { target, points } = params;
  const targetPoint = normalizeTarget(target);
  const pts = toFeatureCollection(points);
  if (pts.features.length === 0) throw new Error("points 图层没有要素");
  const nearest = turf.nearestPoint(targetPoint, pts);
  const distM = Math.round((nearest.properties.dist || 0) * 1000);
  const name =
    nearest.properties.name ||
    nearest.properties.id ||
    `(${turf.getCoord(nearest).join(", ")})`;
  return {
    geojson: turf.featureCollection([targetPoint, nearest]),
    summary: `最近的点是 ${name}，距离约 ${distM} 米`,
    meta: { produced_by: "nearest", params },
  };
}

module.exports = {
  name: "nearest",
  description: "邻近分析：在一组点中找出离目标最近的点及其距离",
  paramsSchema: {
    type: "object",
    properties: {
      target: { description: "目标点：{lng, lat} 或点图层名（或 GeoJSON）" },
      points: { description: "候选点图层名（或 GeoJSON）" },
    },
    required: ["target", "points"],
  },
  execute,
};

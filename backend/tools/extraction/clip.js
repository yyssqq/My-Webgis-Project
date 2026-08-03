const turf = require("@turf/turf");
const { toFeatureCollection, toFeature } = require("../_util");

function execute(params) {
  const { input, clipLayer } = params;
  const fc = toFeatureCollection(input);
  const clipGeom = turf.getGeom(toFeature(clipLayer));

  const out = [];
  for (const f of fc.features) {
    try {
      const part = turf.intersect({
        type: "FeatureCollection",
        features: [turf.feature(turf.getGeom(f)), turf.feature(clipGeom)],
      });
      if (part) {
        part.properties = { ...(f.properties || {}), ...(part.properties || {}) };
        out.push(part);
      }
    } catch {
      /* 该要素与边界无有效交集，跳过 */
    }
  }
  if (out.length === 0) throw new Error("裁剪结果为空：目标图层与裁剪边界无相交");
  return {
    geojson: turf.featureCollection(out),
    summary: `裁剪完成，保留 ${out.length} / ${fc.features.length} 个要素`,
    meta: { produced_by: "clip", params },
  };
}

module.exports = {
  name: "clip",
  description: "裁剪：用边界多边形裁掉目标图层在边界外的部分",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "目标图层名（或 GeoJSON）" },
      clipLayer: { description: "裁剪边界图层名（或 GeoJSON，面要素）" },
    },
    required: ["input", "clipLayer"],
  },
  execute,
};

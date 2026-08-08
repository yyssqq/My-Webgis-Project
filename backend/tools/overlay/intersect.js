const turf = require("@turf/turf");
const { pairwiseOverlay, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  if (!input || !inputB)
    throw new Error("intersect 需要 input 和 inputB 两个图层名（可用 list_layers 查看当前图层名）");

  const results = pairwiseOverlay(input, inputB, (a, b) => {
    const result = turf.intersect({ type: "FeatureCollection", features: [a, b] });
    return result || null;
  });

  if (results.length === 0) throw new Error("两个图层没有相交部分");
  const geojson = results.length === 1
    ? results[0]
    : turf.union({ type: "FeatureCollection", features: results });

  return {
    geojson,
    summary: `求交完成：${countFeatures(input)} × ${countFeatures(inputB)} → ${countFeatures(geojson)} 个相交区域`,
    meta: { produced_by: "intersect", params },
  };
}

module.exports = {
  name: "intersect",
  description: "叠加求交：返回两个图层相交的部分（支持多要素）",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "主图层名（或 GeoJSON）" },
      inputB: { description: "次图层名（或 GeoJSON）" },
    },
    required: ["input", "inputB"],
  },
  execute,
};

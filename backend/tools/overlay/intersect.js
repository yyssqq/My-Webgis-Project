const turf = require("@turf/turf");
const { toFeature, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  if (!input || !inputB)
    throw new Error("intersect 需要 input 和 inputB 两个图层名（可用 list_layers 查看当前图层名），例如 intersect(input:'buffer', inputB:'buffer_1')");
  const a = toFeature(input);
  const b = toFeature(inputB);
  // turf v7 的 overlay 系列需要 FeatureCollection 输入
  const result = turf.intersect({ type: "FeatureCollection", features: [a, b] });
  if (!result) throw new Error("两个图层没有相交部分");
  return {
    geojson: result,
    summary: `求交完成，得到 ${countFeatures(result)} 个要素`,
    meta: { produced_by: "intersect", params },
  };
}

module.exports = {
  name: "intersect",
  description: "叠加求交：返回两个图层相交的部分",
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

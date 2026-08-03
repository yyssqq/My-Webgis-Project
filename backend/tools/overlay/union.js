const turf = require("@turf/turf");
const { toFeature, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  const a = toFeature(input);
  const b = toFeature(inputB);
  let result;
  try {
    result = turf.union({ type: "FeatureCollection", features: [a, b] });
  } catch (e) {
    throw new Error(`合并失败：${e.message}`);
  }
  return {
    geojson: result,
    summary: `合并完成，得到 ${countFeatures(result)} 个要素`,
    meta: { produced_by: "union", params },
  };
}

module.exports = {
  name: "union",
  description: "叠加合并：把两个图层合并为一个整体（并集）",
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

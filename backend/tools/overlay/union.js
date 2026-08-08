const turf = require("@turf/turf");
const { pairwiseOverlay, toFeatures, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  if (!input || !inputB)
    throw new Error("union 需要 input 和 inputB 两个图层名");

  // 把所有要素收集起来做合并
  const allFeatures = [...toFeatures(input), ...toFeatures(inputB)];
  let result = allFeatures[0];
  for (let i = 1; i < allFeatures.length; i++) {
    try {
      result = turf.union({ type: "FeatureCollection", features: [result, allFeatures[i]] });
    } catch {
      // 合并失败时跳过（如几何类型不兼容）
    }
  }

  return {
    geojson: result,
    summary: `合并完成：${countFeatures(input)} + ${countFeatures(inputB)} → ${countFeatures(result)} 个要素`,
    meta: { produced_by: "union", params },
  };
}

module.exports = {
  name: "union",
  description: "叠加合并：把两个图层合并为一个整体（并集，支持多要素）",
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

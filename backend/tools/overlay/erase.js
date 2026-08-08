const turf = require("@turf/turf");
const { toFeatures, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  if (!input || !inputB)
    throw new Error("erase 需要 input（主图层）和 inputB（擦除图层）");

  // 对主图层的每个要素，依次用擦除图层的所有要素减去
  const featuresA = toFeatures(input);
  const featuresB = toFeatures(inputB);
  const results = [];

  for (const a of featuresA) {
    let remaining = a;
    for (const b of featuresB) {
      try {
        const diff = turf.difference({ type: "FeatureCollection", features: [remaining, b] });
        if (!diff) {
          remaining = null;
          break; // 该要素被完全擦除
        }
        remaining = diff;
      } catch {
        // 单次擦除失败不影响
      }
    }
    if (remaining) results.push(remaining);
  }

  if (results.length === 0) throw new Error("相减结果为空（主图层完全被次图层覆盖）");
  const geojson = results.length === 1
    ? results[0]
    : { type: "FeatureCollection", features: results };

  return {
    geojson,
    summary: `相减完成：${countFeatures(input)} 个要素减去 ${countFeatures(inputB)} 个 → 剩余 ${countFeatures(geojson)} 个`,
    meta: { produced_by: "erase", params },
  };
}

module.exports = {
  name: "erase",
  description: "叠加擦除：从主图层中减去次图层覆盖的部分（差集，支持多要素）",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "主图层名（或 GeoJSON）" },
      inputB: { description: "擦除图层名（或 GeoJSON）" },
    },
    required: ["input", "inputB"],
  },
  execute,
};

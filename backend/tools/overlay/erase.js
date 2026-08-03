const turf = require("@turf/turf");
const { toFeature, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  const a = toFeature(input);
  const b = toFeature(inputB);
  const result = turf.difference({ type: "FeatureCollection", features: [a, b] });
  if (!result) throw new Error("相减结果为空（主图层完全被次图层覆盖）");
  return {
    geojson: result,
    summary: `相减完成（主图层减去次图层），得到 ${countFeatures(result)} 个要素`,
    meta: { produced_by: "erase", params },
  };
}

module.exports = {
  name: "erase",
  description: "叠加擦除：从主图层中减去次图层覆盖的部分（差集）",
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

const turf = require("@turf/turf");
const { toFeature, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  const a = toFeature(input);
  const b = toFeature(inputB);
  const aMinusB = turf.difference({ type: "FeatureCollection", features: [a, b] });
  const bMinusA = turf.difference({ type: "FeatureCollection", features: [b, a] });
  const parts = [aMinusB, bMinusA].filter(Boolean);
  if (parts.length === 0) throw new Error("两个图层完全相同，无对称差");
  const result =
    parts.length === 1
      ? parts[0]
      : turf.union({ type: "FeatureCollection", features: parts });
  return {
    geojson: result,
    summary: `对称差完成（各自不相交的部分合并），得到 ${countFeatures(result)} 个要素`,
    meta: { produced_by: "symmetricDifference", params },
  };
}

module.exports = {
  name: "symmetricDifference",
  description: "叠加对称差：返回两个图层各自独有的部分",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层 A 名（或 GeoJSON）" },
      inputB: { description: "图层 B 名（或 GeoJSON）" },
    },
    required: ["input", "inputB"],
  },
  execute,
};

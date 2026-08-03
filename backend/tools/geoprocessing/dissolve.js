const turf = require("@turf/turf");
const { toFeatureCollection, countFeatures } = require("../_util");

function execute(params) {
  const { input, groupBy } = params;
  const fc = toFeatureCollection(input);
  const dissolved = turf.dissolve(fc, { propertyName: groupBy });
  return {
    geojson: dissolved,
    summary: `融合完成，从 ${fc.features.length} 个碎块合并为 ${countFeatures(dissolved)} 个要素${groupBy ? `（按 ${groupBy} 分组）` : ""}`,
    meta: { produced_by: "dissolve", params },
  };
}

module.exports = {
  name: "dissolve",
  description: "融合：把相邻/同属性的碎块合并为一个要素（可按字段分组）",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层名（或 GeoJSON）" },
      groupBy: { description: "可选：按该字段值分组融合" },
    },
    required: ["input"],
  },
  execute,
};

const { toFeatureCollection } = require("../_util");

function execute(params) {
  const { inputs } = params;
  if (!Array.isArray(inputs) || inputs.length === 0)
    throw new Error("merge 需要 inputs 数组（图层名或 GeoJSON 的列表）");
  const all = [];
  for (const x of inputs) {
    const fc = toFeatureCollection(x);
    all.push(...fc.features);
  }
  return {
    geojson: { type: "FeatureCollection", features: all },
    summary: `合并完成：${inputs.length} 个图层共 ${all.length} 个要素`,
    meta: { produced_by: "merge", params },
  };
}

module.exports = {
  name: "merge",
  description: "合并：把多个图层的所有要素合并成一个图层",
  paramsSchema: {
    type: "object",
    properties: {
      inputs: { description: "要合并的图层名数组（或 GeoJSON 数组）" },
    },
    required: ["inputs"],
  },
  execute,
};

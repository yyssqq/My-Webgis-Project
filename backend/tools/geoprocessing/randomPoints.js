const turf = require("@turf/turf");
const { toFeatureCollection } = require("../_util");

function execute(params) {
  const { count, extent } = params;
  const n = Math.min(Math.max(Number(count) || 10, 1), 1000);
  let bbox;
  if (Array.isArray(extent) && extent.length === 4) {
    bbox = extent;
  } else if (extent && (extent.type === "FeatureCollection" || extent.type === "Feature")) {
    bbox = turf.bbox(toFeatureCollection(extent));
  } else {
    bbox = [-180, -85, 180, 85];
  }
  const pts = turf.randomPoint(n, { bbox });
  return {
    geojson: pts,
    summary: `在范围内生成了 ${n} 个随机点`,
    meta: { produced_by: "randomPoints", params },
  };
}

module.exports = {
  name: "randomPoints",
  description: "随机点：在指定范围（图层或 bbox）内生成 N 个随机点",
  paramsSchema: {
    type: "object",
    properties: {
      count: { type: "number", description: "生成的点数量（默认 10）" },
      extent: {
        description: "范围：图层名（或 GeoJSON）取其包围盒，或 [西,南,东,北] 数组；不填为全球",
      },
    },
    required: ["count"],
  },
  execute,
};

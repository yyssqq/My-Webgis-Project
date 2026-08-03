const turf = require("@turf/turf");
const { toFeatureCollection } = require("../_util");

function execute(params) {
  const { points, bbox } = params;
  const pts = toFeatureCollection(points);
  if (pts.features.length < 3) throw new Error("泰森多边形至少需要 3 个点");
  const extent = Array.isArray(bbox) && bbox.length === 4 ? bbox : turf.bbox(pts);
  const polys = turf.voronoi(pts, { bbox: extent });
  return {
    geojson: polys,
    summary: `生成 ${polys.features.length} 个泰森多边形（每个点对应最近邻区域）`,
    meta: { produced_by: "thiessen", params },
  };
}

module.exports = {
  name: "thiessen",
  description: "泰森多边形：根据点集划分最近邻区域（Voronoi 图）",
  paramsSchema: {
    type: "object",
    properties: {
      points: { description: "点图层名（或 GeoJSON），至少 3 个点" },
      bbox: {
        description: "可选：裁剪范围 [西,南,东,北]，不填则取点集的包围盒",
      },
    },
    required: ["points"],
  },
  execute,
};

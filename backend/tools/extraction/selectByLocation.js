const turf = require("@turf/turf");
const { toFeatureCollection } = require("../_util");

function execute(params) {
  const { input, polygons, relation } = params;
  const fc = toFeatureCollection(input);
  const polyFC = toFeatureCollection(polygons);
  const rel = (relation || "intersects").toLowerCase();

  let selected;
  if (rel === "within" || rel === "inside") {
    selected = fc.features.filter((f) =>
      polyFC.features.some((p) => {
        try {
          return turf.booleanWithin(f, p);
        } catch {
          return false;
        }
      })
    );
  } else {
    // 默认 intersects：与任一参照面相交
    selected = fc.features.filter((f) =>
      polyFC.features.some((p) => {
        try {
          return turf.booleanIntersects(f, p);
        } catch {
          return false;
        }
      })
    );
  }
  return {
    geojson: turf.featureCollection(selected),
    summary: `空间筛选完成（${rel}），选出 ${selected.length} / ${fc.features.length} 个要素`,
    meta: { produced_by: "selectByLocation", params },
  };
}

module.exports = {
  name: "selectByLocation",
  description: "按位置筛选：选出与参照面相交(默认)或位于其内部的要素",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "目标图层名（或 GeoJSON）" },
      polygons: { description: "参照面图层名（或 GeoJSON）" },
      relation: { description: "关系：intersects（默认，相交）或 within（位于内部）", enum: ["intersects", "within"] },
    },
    required: ["input", "polygons"],
  },
  execute,
};

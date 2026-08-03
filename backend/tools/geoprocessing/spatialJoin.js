const turf = require("@turf/turf");
const { toFeatureCollection } = require("../_util");

function execute(params) {
  const { target, join, relation, fields } = params;
  const targetFC = toFeatureCollection(target);
  const joinFC = toFeatureCollection(join);
  const rel = (relation || "intersects").toLowerCase();

  const joined = targetFC.features.map((f) => {
    const matches = joinFC.features.filter((jf) => {
      try {
        return rel === "within" ? turf.booleanWithin(f, jf) : turf.booleanIntersects(f, jf);
      } catch {
        return false;
      }
    });
    const props = { ...(f.properties || {}) };
    if (matches.length) {
      const src = matches[0].properties || {};
      const pick = Array.isArray(fields) && fields.length ? fields : Object.keys(src);
      for (const k of pick) {
        props[`join_${k}`] = src[k];
      }
      props._joinCount = matches.length;
    } else {
      props._joinCount = 0;
    }
    return { ...f, properties: props };
  });

  const matched = joined.filter((f) => (f.properties._joinCount || 0) > 0).length;
  return {
    geojson: turf.featureCollection(joined),
    summary: `空间连接完成：${matched} / ${joined.length} 个目标要素关联到了连接图层（字段前缀 join_）`,
    meta: { produced_by: "spatialJoin", params },
  };
}

module.exports = {
  name: "spatialJoin",
  description: "空间连接：把连接图层的属性按空间关系挂到目标图层上（如每个学校属于哪个区）",
  paramsSchema: {
    type: "object",
    properties: {
      target: { description: "目标图层名（或 GeoJSON），属性被挂接" },
      join: { description: "连接图层名（或 GeoJSON），提供属性" },
      relation: { description: "intersects（默认，相交）或 within（目标在连接面内）", enum: ["intersects", "within"] },
      fields: { description: "可选：要挂接的字段名数组，默认全部（前缀 join_）" },
    },
    required: ["target", "join"],
  },
  execute,
};

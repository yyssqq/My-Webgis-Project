const turf = require("@turf/turf");
const { toFeatureCollection } = require("../_util");

function round(n) {
  return Math.round(n * 100) / 100;
}

function execute(params) {
  const { input, groupBy, field, stats } = params;
  const fc = toFeatureCollection(input);
  const fieldName = groupBy || "未分组";
  const groups = new Map();
  for (const f of fc.features) {
    const key = String(f.properties?.[groupBy] ?? "未分组");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }

  const rows = [];
  const groupFeatures = [];
  for (const [key, feats] of groups) {
    const row = { [fieldName]: key, count: feats.length };
    if (field) {
      const vals = feats
        .map((f) => Number(f.properties?.[field]))
        .filter((n) => Number.isFinite(n));
      if (vals.length) {
        if (!stats || stats.includes("sum")) row.sum = round(vals.reduce((a, b) => a + b, 0));
        if (!stats || stats.includes("avg")) row.avg = round(vals.reduce((a, b) => a + b, 0) / vals.length);
        if (!stats || stats.includes("min")) row.min = round(Math.min(...vals));
        if (!stats || stats.includes("max")) row.max = round(Math.max(...vals));
      }
    }
    rows.push(row);

    // 每个分组合并成面，方便上图看分布
    try {
      const dissolved = turf.dissolve(turf.featureCollection(feats));
      if (dissolved) {
        dissolved.properties = { ...(dissolved.properties || {}), ...row };
        groupFeatures.push(dissolved);
      }
    } catch {
      /* 几何无法合并时跳过 */
    }
  }

  const summaryRows = rows
    .map((r) => `${r[fieldName]}：${Object.entries(r).map(([k, v]) => `${k}=${v}`).join(" ")}`)
    .join("\n");
  return {
    geojson: turf.featureCollection(groupFeatures),
    rows,
    summary: `按「${fieldName}」分组统计，共 ${rows.length} 组：\n${summaryRows}`,
    meta: { produced_by: "summarize", params },
  };
}

module.exports = {
  name: "summarize",
  description: "统计汇总：按字段分组，计算每组数量及数值字段的求和/平均/最小/最大",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层名（或 GeoJSON）" },
      groupBy: { description: "分组字段名" },
      field: { description: "可选：需要聚合统计的数值字段名" },
      stats: {
        description: "可选：聚合方式数组 ['sum','avg','min','max']，不填默认全部",
      },
    },
    required: ["input", "groupBy"],
  },
  execute,
};

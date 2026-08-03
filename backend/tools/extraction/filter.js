const { toFeatureCollection } = require("../_util");

function matchValue(actual, operator, expected) {
  const a = String(actual ?? "");
  switch (operator) {
    case "eq":
      return a === String(expected);
    case "neq":
      return a !== String(expected);
    case "contains":
      return a.toLowerCase().includes(String(expected).toLowerCase());
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    default:
      throw new Error(`不支持的比较符: ${operator}`);
  }
}

/**
 * 支持多条条件（AND 关系），比 selectByAttributes 更灵活。
 * conditions: [{field, operator, value}, ...]
 */
function execute(params) {
  const { input, conditions } = params;
  const fc = toFeatureCollection(input);
  if (!Array.isArray(conditions) || conditions.length === 0)
    throw new Error("filter 需要 conditions 数组，如 [{field:'类型', operator:'eq', value:'学校'}]");

  const selected = fc.features.filter((f) =>
    conditions.every((c) => matchValue(f.properties?.[c.field], c.operator, c.value))
  );
  return {
    geojson: { type: "FeatureCollection", features: selected },
    summary: `按 ${conditions.length} 条属性条件过滤，保留 ${selected.length} / ${fc.features.length} 个要素`,
    meta: { produced_by: "filter", params },
  };
}

module.exports = {
  name: "filter",
  description: "属性过滤：按多条条件（AND）筛掉不满足的要素，比 selectByAttributes 支持多条件",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层名（或 GeoJSON）" },
      conditions: {
        description: "条件数组，如 [{field:'类型', operator:'eq', value:'学校'}]，全部满足才保留",
      },
    },
    required: ["input", "conditions"],
  },
  execute,
};

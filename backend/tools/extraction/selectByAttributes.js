const { toFeatureCollection } = require("../_util");

function matchValue(actual, operator, expected) {
  const a = String(actual ?? "");
  switch (operator) {
    case "eq":
    case "=":
      return a === String(expected);
    case "neq":
    case "!=":
      return a !== String(expected);
    case "contains":
    case "like":
      return a.toLowerCase().includes(String(expected).toLowerCase());
    case "startsWith":
      return a.toLowerCase().startsWith(String(expected).toLowerCase());
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    default:
      throw new Error(`不支持的比较符: ${operator}（支持 eq/neq/gt/gte/lt/lte/contains/startsWith）`);
  }
}

function execute(params) {
  const { input, field, operator, value } = params;
  const fc = toFeatureCollection(input);
  const selected = fc.features.filter((f) => matchValue(f.properties?.[field], operator, value));
  return {
    geojson: {
      type: "FeatureCollection",
      features: selected,
    },
    summary: `按属性筛选完成（${field} ${operator} ${value}），选出 ${selected.length} / ${fc.features.length} 个要素`,
    meta: { produced_by: "selectByAttributes", params },
  };
}

module.exports = {
  name: "selectByAttributes",
  description: "按属性筛选：根据字段值条件（等于/大于/包含等）选出要素",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层名（或 GeoJSON）" },
      field: { description: "字段名" },
      operator: { description: "eq/neq/gt/gte/lt/lte/contains/startsWith" },
      value: { description: "比较值" },
    },
    required: ["input", "field", "operator", "value"],
  },
  execute,
};

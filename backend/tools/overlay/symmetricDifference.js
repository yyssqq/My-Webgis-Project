const turf = require("@turf/turf");
const { toFeatures, countFeatures } = require("../_util");

function execute(params) {
  const { input, inputB } = params;
  if (!input || !inputB)
    throw new Error("symmetricDifference 需要 input 和 inputB 两个图层名");

  // A - B
  const aMinusB = [];
  for (const a of toFeatures(input)) {
    let remaining = a;
    for (const b of toFeatures(inputB)) {
      try {
        const diff = turf.difference({ type: "FeatureCollection", features: [remaining, b] });
        if (!diff) { remaining = null; break; }
        remaining = diff;
      } catch {}
    }
    if (remaining) aMinusB.push(remaining);
  }

  // B - A
  const bMinusA = [];
  for (const b of toFeatures(inputB)) {
    let remaining = b;
    for (const a of toFeatures(input)) {
      try {
        const diff = turf.difference({ type: "FeatureCollection", features: [remaining, a] });
        if (!diff) { remaining = null; break; }
        remaining = diff;
      } catch {}
    }
    if (remaining) bMinusA.push(remaining);
  }

  const allDiff = [...aMinusB, ...bMinusA];
  if (allDiff.length === 0) throw new Error("两个图层完全相同，无对称差");

  let result = allDiff[0];
  for (let i = 1; i < allDiff.length; i++) {
    try {
      result = turf.union({ type: "FeatureCollection", features: [result, allDiff[i]] });
    } catch {}
  }

  return {
    geojson: result,
    summary: `对称差完成：${countFeatures(input)} △ ${countFeatures(inputB)} → ${countFeatures(result)} 个差异区域`,
    meta: { produced_by: "symmetricDifference", params },
  };
}

module.exports = {
  name: "symmetricDifference",
  description: "叠加对称差：返回两个图层各自独有的部分（支持多要素）",
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

const turf = require("@turf/turf");
const { toFeature, countFeatures } = require("../_util");

function execute(params) {
  const { input, distances } = params;
  const src = toFeature(input);
  const list = (Array.isArray(distances) ? distances : [distances])
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (list.length === 0) throw new Error("distances 需要至少一个正数（公里）");

  const rings = [];
  let prev = null;
  for (const d of list) {
    const buff = turf.buffer(src, d, { units: "kilometers", steps: 64 });
    let ring;
    if (prev) ring = turf.difference({ type: "FeatureCollection", features: [buff, prev] }); // 环带 = 当前圈 - 内圈
    else ring = buff;
    if (ring) {
      ring.properties = { ...(ring.properties || {}), distance: d };
      rings.push(ring);
    }
    prev = buff;
  }
  return {
    geojson: turf.featureCollection(rings),
    summary: `生成 ${rings.length} 个同心缓冲区（半径: ${list.join("、")} 公里）`,
    meta: { produced_by: "multipleRingBuffer", params },
  };
}

module.exports = {
  name: "multipleRingBuffer",
  description: "多重缓冲区：围绕目标生成多个半径的同心环带（缓冲区）",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "目标图层名（或 GeoJSON），如点、线、面" },
      distances: {
        description: "半径数组（公里），如 [1, 3, 5]",
      },
    },
    required: ["input", "distances"],
  },
  execute,
};

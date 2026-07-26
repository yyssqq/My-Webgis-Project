const turf = require("@turf/turf");

/**
 * 距离工具：计算两个点之间的直线距离
 *
 * 输入：{ from: {lng, lat}, to: {lng, lat} }
 * 输出：距离（公里）
 */
function execute(params) {
  const { from, to } = params;

  const fromPoint = turf.point([from.lng, from.lat]);
  const toPoint = turf.point([to.lng, to.lat]);

  // 单位为公里
  const distanceKm = turf.distance(fromPoint, toPoint, { units: "kilometers" });

  // 顺便画一条线方便前端显示
  const line = turf.lineString([
    [from.lng, from.lat],
    [to.lng, to.lat],
  ]);

  return {
    distance: Math.round(distanceKm * 100) / 100,
    geojson: line,
    summary: `两点距离：${(Math.round(distanceKm * 100) / 100).toFixed(2)} 公里`,
  };
}

module.exports = { name: "distance", description: "距离分析：计算两点间的直线距离", execute };

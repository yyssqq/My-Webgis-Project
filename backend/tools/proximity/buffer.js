const turf = require("@turf/turf");

/**
 * 缓冲区工具：围绕一个点生成指定半径的圆形区域
 *
 * 输入：{ lng, lat, distance }  distance 单位：公里
 * 输出：GeoJSON Polygon（缓冲区的面）
 */
function execute(params) {
  const { lng, lat, distance } = params;

  // 1. 创建一个点
  const point = turf.point([lng, lat]);

  // 2. 计算缓冲区（distance 单位公里，step 控制圆弧精度）
  const buffer = turf.buffer(point, distance, { units: "kilometers", steps: 64 });

  // 3. 返回 GeoJSON
  return {
    geojson: buffer,
    summary: `以 (${lng.toFixed(4)}, ${lat.toFixed(4)}) 为中心，半径 ${distance} 公里的缓冲区`,
  };
}

module.exports = {
  name: "buffer",
  description: "缓冲区分析：围绕一个点生成指定半径的区域",
  paramsSchema: {
    type: "object",
    properties: {
      lng: { type: "number", description: "中心点经度" },
      lat: { type: "number", description: "中心点纬度" },
      distance: { type: "number", description: "缓冲区半径（公里）" },
    },
    required: ["lng", "lat", "distance"],
  },
  execute,
};

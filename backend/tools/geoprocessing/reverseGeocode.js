const turf = require("@turf/turf");

/**
 * 逆地理编码：根据经纬度查询地名（Photon/OSM 免费接口）
 */
async function execute(params) {
  const { lng, lat } = params;
  if (lng == null || lat == null) throw new Error("reverseGeocode 需要 lng 和 lat");

  const url = `https://photon.komoot.io/reverse?lon=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`逆地理编码请求失败 (${response.status})`);
  const data = await response.json();

  const f = data.features?.[0];
  if (!f) throw new Error(`坐标 (${lng}, ${lat}) 附近没找到地点`);
  const props = f.properties || {};
  const name =
    [props.name, props.city, props.district, props.state, props.country]
      .filter(Boolean)
      .join("，");

  return {
    geojson: turf.point([lng, lat], props),
    summary: `坐标 (${lng}, ${lat}) 对应：${name}`,
    meta: { produced_by: "reverseGeocode", params },
  };
}

module.exports = {
  name: "reverseGeocode",
  description: "逆地理编码：把经纬度坐标转换为地名",
  paramsSchema: {
    type: "object",
    properties: {
      lng: { type: "number", description: "经度" },
      lat: { type: "number", description: "纬度" },
    },
    required: ["lng", "lat"],
  },
  execute,
};

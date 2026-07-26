/**
 * 地理编码工具：将地名转换为经纬度坐标
 * 使用 Photon（基于 OpenStreetMap，免费无需 Key，国内可访问）
 */
async function execute(params) {
  const { place } = params;

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(place)}&limit=5`;

  const response = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`地理编码请求失败 (${response.status})`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`找不到地点: ${place}，请换个名称试试（比如更具体的地址）`);
  }

  // 返回前 5 个候选结果
  const candidates = data.features.map((f) => ({
    name: f.properties.name || "",
    city: f.properties.city || "",
    state: f.properties.state || "",
    country: f.properties.country || "",
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));

  const best = candidates[0];

  return {
    candidates,
    summary: `找到 "${place}"：${best.name}${best.city ? "，" + best.city : ""}${best.state ? "，" + best.state : ""}，坐标 (${best.lng.toFixed(4)}, ${best.lat.toFixed(4)})，共 ${candidates.length} 个候选`,
  };
}

module.exports = { name: "geocode", description: "地理编码：将地名（如大理古城、纽约中央公园）转换为经纬度坐标", execute };

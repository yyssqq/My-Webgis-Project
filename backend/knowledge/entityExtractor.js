/**
 * 实体提取器：从 events.jsonl 中提取并去重 Place / Layer / Analysis 实体
 *
 * Place 实体（地名→坐标）：
 *   从 geocode 工具的 tool_exec 事件中解析结果摘要。
 *   同一地名 + 坐标距离 < 1km → 合并为一个实体。
 *
 * Layer 实体（图层）：
 *   从 layer_created 事件提取。
 *
 * 用法：
 *   const { places, layers } = extractEntities()
 *   返回的对象可用于构建 knowledge/entities.json
 */

const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "events.jsonl");

// ---- 坐标距离（简化版 Haversine，单位 km） ----
function distKm(lng1, lat1, lng2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- 从 geocode 结果摘要中解析地名和坐标 ----
// 摘要格式: 找到 "天安门"：天安门，北京市，北京市，坐标 (116.3913, 39.9074)，共 5 个候选
function parseGeocodeSummary(summaryText) {
  const m = summaryText.match(/找到 "(.+?)".+?坐标 \((\d+\.?\d*), (\d+\.?\d*)\)/);
  if (!m) return null;
  return {
    name: m[1],
    lng: parseFloat(m[2]),
    lat: parseFloat(m[3]),
  };
}

// ---- 主函数 ----
function extractEntities() {
  if (!fs.existsSync(EVENTS_FILE)) return { places: [], layers: [] };

  const places = [];    // { name, lng, lat, aliases[], mentionCount, firstSeen, lastSeen }
  const layers = [];    // { name, producedBy, featureCount, firstSeen }

  const lines = fs.readFileSync(EVENTS_FILE, "utf-8").split("\n").filter(Boolean);

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }

    // ---- 提取 Place（从 geocode 工具结果） ----
    if (event.type === "tool_exec" && event.tool === "geocode") {
      const parsed = parseGeocodeSummary(event.summary || "");
      if (!parsed) continue;

      // 去重：找已有同名且距离 < 1km 的实体
      const existing = places.find(p =>
        p.name === parsed.name || (p.aliases || []).includes(parsed.name)
      );
      if (existing) {
        // 同地名但坐标差太远 → 视作不同地点（如"鼓楼"可能指北京/南京的鼓楼）
        const d = distKm(existing.lng, existing.lat, parsed.lng, parsed.lat);
        if (d < 1) {
          existing.mentionCount += 1;
          existing.lastSeen = event.timestamp;
          continue;
        }
      }

      places.push({
        name: parsed.name,
        lng: parsed.lng,
        lat: parsed.lat,
        aliases: [parsed.name],
        mentionCount: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
      });
    }

    // ---- 提取 Layer（从 layer_created 事件） ----
    if (event.type === "layer_created") {
      layers.push({
        name: event.layerName,
        producedBy: event.producedBy,
        featureCount: event.featureCount,
        firstSeen: event.timestamp,
      });
    }
  }

  return { places, layers };
}

// ---- CLI：node entityExtractor.js → 打印结果 ----
if (require.main === module) {
  const { places, layers } = extractEntities();
  console.log(JSON.stringify({ places, layers }, null, 2));
}

module.exports = { extractEntities };

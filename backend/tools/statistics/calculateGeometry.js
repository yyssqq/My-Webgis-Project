const turf = require("@turf/turf");
const { toFeature, toFeatureCollection, countFeatures } = require("../_util");

function execute(params) {
  const { input, measure } = params;
  const fc = toFeatureCollection(input);
  const m = (measure || "area").toLowerCase();

  if (m === "area") {
    // 面积：只统计面要素，输出每要素面积（m² → 可按公顷/平方公里）
    const withArea = fc.features.map((f) => {
      const areaM2 = f.geometry?.type?.includes("Polygon") ? turf.area(f) : 0;
      return { ...f, properties: { ...(f.properties || {}), area_ha: Math.round(areaM2 / 10000 * 100) / 100 } };
    });
    const totalHa = Math.round(withArea.reduce((s, f) => s + (f.properties.area_ha || 0), 0) * 100) / 100;
    return {
      geojson: turf.featureCollection(withArea),
      summary: `面积统计完成，共 ${withArea.length} 个面要素，总面积约 ${totalHa} 公顷（1 公顷 = 1 万平方米）`,
      meta: { produced_by: "calculateGeometry", params },
    };
  }

  if (m === "length") {
    const nonLines = fc.features.filter((f) => f.geometry?.type !== "LineString");
    if (nonLines.length && fc.features.length === nonLines.length)
      throw new Error("length 只支持线要素图层");
    const withLen = fc.features.map((f) => {
      const km = f.geometry?.type === "LineString" ? turf.length(f, { units: "kilometers" }) : 0;
      return { ...f, properties: { ...(f.properties || {}), length_km: Math.round(km * 100) / 100 } };
    });
    const totalKm = Math.round(withLen.reduce((s, f) => s + (f.properties.length_km || 0), 0) * 100) / 100;
    return {
      geojson: turf.featureCollection(withLen),
      summary: `长度统计完成，共 ${withLen.length} 条线，总长约 ${totalKm} 公里`,
      meta: { produced_by: "calculateGeometry", params },
    };
  }

  if (m === "centroid") {
    const cents = fc.features.map((f) => turf.centroid(f));
    return {
      geojson: turf.featureCollection(cents),
      summary: `已生成 ${cents.length} 个质心点`,
      meta: { produced_by: "calculateGeometry", params },
    };
  }

  throw new Error(`measure 只能是 area / length / centroid，收到: ${measure}`);
}

module.exports = {
  name: "calculateGeometry",
  description: "几何计算：计算图层的面积(area)、长度(length)或质心(centroid)",
  paramsSchema: {
    type: "object",
    properties: {
      input: { description: "图层名（或 GeoJSON）" },
      measure: { description: "area=面积 / length=线长度 / centroid=质心点", enum: ["area", "length", "centroid"] },
    },
    required: ["input", "measure"],
  },
  execute,
};

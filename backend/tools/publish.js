const fs = require("fs");
const path = require("path");
const shpwrite = require("@mapbox/shp-write");

const GS_URL = "http://localhost:8080/geoserver";
const GS_AUTH = "Basic " + Buffer.from("admin:geoserver").toString("base64");
const WORKSPACE = "mywebgis";

/**
 * 发布工具：GeoJSON → shapefile(zip) → GeoServer REST 上传，发布为 WMS/WFS。
 * 使用 @mapbox/shp-write（shp-write 官方维护版）生成 shapefile，
 * 通过 PUT .../datastores/{name}/file.shp?configure=all 一次完成建库 + 发布。
 */
async function execute(params) {
  const { layerName, geojson } = params;
  if (!layerName || !geojson) throw new Error("publish 需要 layerName 和 geojson");

  await ensureWorkspace();

  // 1. GeoJSON → shapefile zip（所有几何类型统一命名为 layerName，避免类型名当图层名）
  const fc =
    geojson.type === "FeatureCollection"
      ? geojson
      : { type: "FeatureCollection", features: [geojson] };
  const types = { point: layerName, polyline: layerName, polygon: layerName, multipolygon: layerName, multiline: layerName };
  const zipBuffer = await shpwrite.zip(fc, { outputType: "nodebuffer", compression: "STORE", types });
  if (!zipBuffer || zipBuffer.length === 0) throw new Error("shapefile 生成失败：图层没有支持的几何类型");

  // 2. 删除同名旧 datastore（允许重新发布）
  await fetch(`${GS_URL}/rest/workspaces/${WORKSPACE}/datastores/${layerName}?recurse=true`, {
    method: "DELETE",
    headers: { Authorization: GS_AUTH },
  });

  // 3. 上传 shapefile（configure=all 自动发布 featuretype）
  const res = await fetch(
    `${GS_URL}/rest/workspaces/${WORKSPACE}/datastores/${layerName}/file.shp?configure=all`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/zip", Authorization: GS_AUTH },
      body: Buffer.from(zipBuffer),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GeoServer 上传失败 (${res.status}): ${err.slice(0, 200)}`);
  }

  const wmsUrl = `/geoserver/${WORKSPACE}/wms`;
  const wfsUrl = `/geoserver/${WORKSPACE}/ows`;
  return {
    wmsUrl,
    wfsUrl,
    layerName,
    summary: `图层 "${layerName}" 已发布到 GeoServer WMS/WFS`,
  };
}

async function ensureWorkspace() {
  const res = await fetch(`${GS_URL}/rest/workspaces/${WORKSPACE}.json`, {
    headers: { Authorization: GS_AUTH },
  });
  if (res.ok) return;

  await fetch(`${GS_URL}/rest/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: GS_AUTH },
    body: JSON.stringify({ workspace: { name: WORKSPACE } }),
  });
}

module.exports = { name: "publish", description: "发布图层：将 GeoJSON 发布到 GeoServer WMS/WFS", execute };

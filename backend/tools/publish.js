const fs = require("fs");
const path = require("path");
const shpWrite = require("shp-write");

const GS_URL = "http://localhost:8080/geoserver";
const GS_AUTH = "Basic " + Buffer.from("admin:geoserver").toString("base64");
const WORKSPACE = "mywebgis";

/**
 * 发布工具：GeoJSON → Shapefile → GeoServer WMS/WFS
 */
async function execute(params) {
  const { layerName, geojson } = params;

  // 1. 确保 workspace 存在
  await ensureWorkspace();

  // 2. GeoJSON 转 Shapefile，保存到 GeoServer 数据目录
  const dataDir = path.join(
    __dirname, "..", "..", "runtime", "data_dir", "data", WORKSPACE, layerName
  );
  fs.mkdirSync(dataDir, { recursive: true });

  // 包装为 FeatureCollection 如果还不是
  const fc = geojson.type === "FeatureCollection"
    ? geojson
    : { type: "FeatureCollection", features: [geojson] };

  // 写 Shapefile
  const zipPath = await writeShapefile(fc, dataDir, layerName);
  console.log(`[publish] Shapefile 已保存: ${dataDir}`);

  // 3. 删除旧 datastore（如果存在）
  await fetch(`${GS_URL}/rest/workspaces/${WORKSPACE}/datastores/${layerName}?recurse=true`, {
    method: "DELETE",
    headers: { Authorization: GS_AUTH },
  });

  // 4. 创建 Shapefile 目录类型 datastore
  const storeBody = {
    dataStore: {
      name: layerName,
      type: "Directory of spatial files (shapefiles)",
      connectionParameters: {
        entry: [
          { "@key": "directory", $: `file:${dataDir}` }
        ]
      }
    }
  };

  const storeRes = await fetch(`${GS_URL}/rest/workspaces/${WORKSPACE}/datastores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: GS_AUTH },
    body: JSON.stringify(storeBody),
  });

  if (!storeRes.ok) {
    const err = await storeRes.text();
    throw new Error(`创建 datastore 失败: ${err.slice(0, 200)}`);
  }
  console.log("[publish] datastore 已创建");

  // 5. 发布图层
  const typeBody = {
    featureType: {
      name: layerName,
      title: layerName,
      srs: "EPSG:4326",
    }
  };

  const typeRes = await fetch(
    `${GS_URL}/rest/workspaces/${WORKSPACE}/datastores/${layerName}/featuretypes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: GS_AUTH },
      body: JSON.stringify(typeBody),
    }
  );

  // 如果图层已存在也算成功
  const typeText = await typeRes.text();
  if (!typeRes.ok && !typeText.includes("already exists")) {
    throw new Error(`发布图层失败: ${typeText.slice(0, 200)}`);
  }
  console.log("[publish] 图层已发布");

  const wmsUrl = `${GS_URL}/${WORKSPACE}/wms`;
  const wfsUrl = `${GS_URL}/${WORKSPACE}/ows`;

  return {
    wmsUrl,
    wfsUrl,
    layerName,
    summary: `图层 "${layerName}" 已发布到 GeoServer`,
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

/**
 * GeoJSON → Shapefile（shp-write 返回 zip buffer）
 */
function writeShapefile(geojson, dir, name) {
  return new Promise((resolve, reject) => {
    shpWrite.write(geojson, { folder: dir, filename: name, outputType: "file" }, (err) => {
      if (err) return reject(err);
      console.log("[publish] shapefile files:", fs.readdirSync(dir));
      resolve(path.join(dir, `${name}.shp`));
    });
  });
}

module.exports = { name: "publish", description: "发布图层：将 GeoJSON 转为 Shapefile 并发布到 GeoServer WMS/WFS", execute };

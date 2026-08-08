/**
 * layer_store：图层资产 + 元数据（血统）的持久化存储
 *
 * 约定（ADR-0004）：每个图层是 { name, geojson, meta{produced_by, parents, params}, createdAt }。
 * 工具结果一律经这里存取，后续步骤按 name 引用。
 *
 * 持久化：每次变更自动写入 data/layers.json，启动时自动加载。
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "layers.json");

const layers = new Map();

/** 确保 data/ 目录存在 */
function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 将当前 layers Map 序列化到磁盘 */
function saveToDisk() {
  try {
    ensureDataDir();
    const data = [...layers.values()];
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[layer_store] 保存到磁盘失败:", err.message);
  }
}

/** 启动时从磁盘加载 */
function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return;
    for (const layer of data) {
      if (layer.name && layer.geojson) {
        layers.set(layer.name, layer);
      }
    }
    console.log(`[layer_store] 从磁盘加载了 ${layers.size} 个图层`);
  } catch (err) {
    console.error("[layer_store] 从磁盘加载失败:", err.message);
  }
}

function normalizeMeta(meta = {}) {
  return {
    produced_by: meta.produced_by || null,
    parents: meta.parents || [],
    params: meta.params || {},
  };
}

/**
 * 写入（同名覆盖，保留原 createdAt）
 */
function put(name, geojson, meta = {}) {
  const existing = layers.get(name);
  const layer = {
    name,
    geojson,
    meta: normalizeMeta(meta),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  layers.set(name, layer);
  saveToDisk();
  return layer;
}

function get(name) {
  return layers.get(name);
}

/**
 * 返回列表元信息（不含 GeoJSON 体积数据）
 */
function list() {
  return [...layers.values()].map(({ name, meta, createdAt }) => ({ name, meta, createdAt }));
}

function remove(name) {
  const ok = layers.delete(name);
  if (ok) saveToDisk();
  return ok;
}

function rename(oldName, newName) {
  const layer = layers.get(oldName);
  if (!layer) return false;
  layers.delete(oldName);
  layer.name = newName;
  layers.set(newName, layer);
  saveToDisk();
  return true;
}

/**
 * 生成不冲突的图层名，如 buffer → buffer_1
 */
function generateName(prefix) {
  const base = prefix || "layer";
  let name = base;
  let i = 1;
  while (layers.has(name)) name = `${base}_${i++}`;
  return name;
}

// 启动时加载
loadFromDisk();

module.exports = { put, get, list, remove, rename, generateName };

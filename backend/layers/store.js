/**
 * layer_store：图层资产 + 元数据（血统）的内存存储
 *
 * 约定（ADR-0004）：每个图层是 { name, geojson, meta{produced_by, parents, params}, createdAt }。
 * 工具结果一律经这里存取，后续步骤按 name 引用。
 */

const layers = new Map();

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
  return layers.delete(name);
}

function rename(oldName, newName) {
  const layer = layers.get(oldName);
  if (!layer) return false;
  layers.delete(oldName);
  layer.name = newName;
  layers.set(newName, layer);
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

module.exports = { put, get, list, remove, rename, generateName };

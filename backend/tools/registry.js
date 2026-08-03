/**
 * 工具注册器：扫描 tools/ 下的类目目录，统一注册所有 GIS 工具
 *
 * 约定（docs/conventions.md §5 + ADR-0004）：
 * - 每个工具文件导出 { name, description, paramsSchema?, execute }
 * - execute(params) 返回 { geojson?, summary, meta? }
 * - 新增工具：在对应类目目录建文件即可，无需改这里
 *
 * 图层引用：参数中值为字符串且恰好等于 layer_store 中的图层名时，
 * 会自动解析为该图层的 GeoJSON，并记录到结果的 meta.parents（血统）。
 */

const fs = require("fs");
const path = require("path");
const layers = require("../layers/store");

const CATEGORIES = ["meta", "overlay", "proximity", "statistics", "extraction", "geoprocessing"];

const tools = [];
const toolMap = {};

for (const cat of CATEGORIES) {
  const dir = path.join(__dirname, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const tool = require(path.join(dir, f));
    if (tool && tool.name && !toolMap[tool.name]) {
      tools.push(tool);
      toolMap[tool.name] = tool;
    }
  }
}

/**
 * 解析参数里的图层引用：字符串若等于某个图层名 → 替换为该图层 GeoJSON
 * 返回 { resolved, parents }
 */
function resolveLayerRefs(params) {
  const resolved = {};
  const parents = [];
  const resolveOne = (v) => {
    if (typeof v === "string") {
      const layer = layers.get(v);
      if (layer) {
        parents.push(v);
        return layer.geojson;
      }
      return v;
    }
    return v;
  };
  for (const [k, v] of Object.entries(params || {})) {
    resolved[k] = Array.isArray(v) ? v.map(resolveOne) : resolveOne(v);
  }
  return { resolved, parents: [...new Set(parents)] };
}

/**
 * 获取所有工具的元信息（给 AI / 前端看，不含执行逻辑）
 */
function listTools() {
  return tools.map((t) => ({ name: t.name, description: t.description }));
}

/**
 * 执行指定工具（支持 async 工具）
 */
async function executeTool(toolName, params) {
  const tool = toolMap[toolName];
  if (!tool) {
    throw new Error(`未知工具: ${toolName}。可用工具: ${Object.keys(toolMap).join(", ")}`);
  }
  const { resolved, parents } = resolveLayerRefs(params || {});
  const raw = tool.execute(resolved);
  const result = raw instanceof Promise ? await raw : raw;
  // 记录血统：消费了哪些图层
  if (result.meta) result.meta.parents = parents;
  return result;
}

module.exports = { listTools, executeTool };

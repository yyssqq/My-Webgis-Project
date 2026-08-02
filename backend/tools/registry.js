/**
 * 工具注册器：扫描 tools/ 下的类目目录，统一注册所有 GIS 工具
 *
 * 约定（docs/conventions.md §5）：
 * - 每个工具文件导出 { name, description, execute }
 * - execute(params) 返回 { geojson?, summary, meta? }（ADR-0004）
 * - 新增工具：在对应类目目录建文件即可，无需改这里
 */

const fs = require("fs");
const path = require("path");

const CATEGORIES = ["overlay", "proximity", "statistics", "extraction", "geoprocessing"];

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
  const result = tool.execute(params);
  return result instanceof Promise ? await result : result;
}

module.exports = { listTools, executeTool };

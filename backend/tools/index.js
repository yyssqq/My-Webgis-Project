/**
 * 工具注册器：统一管理所有 GIS 工具
 *
 * 约定：每个工具文件导出 { name, description, execute }
 *
 * execute(params) 返回 { geojson?, summary, ... }
 * execute 可以是 async 函数
 */

const buffer = require("./buffer");
const distance = require("./distance");
const geocode = require("./geocode");

// 工具列表（新增工具只需要在这里加一行）
const tools = [geocode, buffer, distance];

// 按名称快速查找
const toolMap = {};
tools.forEach((tool) => {
  toolMap[tool.name] = tool;
});

/**
 * 获取所有工具的元信息（给 AI / 前端看，不含执行逻辑）
 */
function listTools() {
  return tools.map((t) => ({ name: t.name, description: t.description }));
}

/**
 * 执行指定工具（支持 async 工具）
 * @param {string} toolName  工具名称
 * @param {object} params    工具参数
 * @returns {Promise<object>} 工具的返回结果
 */
async function executeTool(toolName, params) {
  const tool = toolMap[toolName];
  if (!tool) {
    throw new Error(`未知工具: ${toolName}。可用工具: ${Object.keys(toolMap).join(", ")}`);
  }
  const result = tool.execute(params);
  // 如果 execute 返回 Promise，等待它
  if (result instanceof Promise) {
    return await result;
  }
  return result;
}

module.exports = { listTools, executeTool };

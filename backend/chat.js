const fs = require("fs");
const path = require("path");
const { listTools, executeTool } = require("./tools/registry");
const layers = require("./layers/store");
const logger = require("./knowledge/eventLogger");

/**
 * 加载 skills 目录下所有的 SKILL.md 文件
 * 拼成一个完整的操作手册文本
 */
function loadSkills() {
  const skillsDir = path.join(__dirname, "skills");
  if (!fs.existsSync(skillsDir)) return "";

  const files = fs.readdirSync(skillsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) return "";

  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(skillsDir, f), "utf-8");
      return content.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    })
    .join("\n\n---\n\n");
}

/**
 * 构建技能索引（仅 name + description）
 */
function buildSkillIndex() {
  const skillsDir = path.join(__dirname, "skills");
  if (!fs.existsSync(skillsDir)) return "";

  const files = fs.readdirSync(skillsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) return "";

  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(skillsDir, f), "utf-8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return "";
      const frontmatter = match[1];
      const name = (frontmatter.match(/name:\s*(.+)/) || [])[1] || f;
      const desc = (frontmatter.match(/description:\s*(.+)/) || [])[1] || "";
      return `- **${name.trim()}**: ${desc.trim()}`;
    })
    .join("\n");
}

/**
 * 构建 System Prompt
 */
function buildSystemPrompt() {
  const skillIndex = buildSkillIndex();
  const skillsBody = loadSkills();

  return `你是一个 GIS 空间分析专家，具备独立的思考和推理能力。你不是一个命令行工具，而是一个可以聊天、提问、规划、分析、解释结果的智能伙伴。

## 可用技能
${skillIndex}

## 技能手册（包含工具说明、配方、话术规范、示例）
${skillsBody}`;
}

/**
 * 构建原生 function calling 的 tools 数组（OpenAI 兼容）
 */
function buildToolsSchema() {
  return listTools().map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.paramsSchema || {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
    },
  }));
}

/**
 * 调用 LLM API（支持 tools 原生函数调用）
 */
async function callLLM(messages, tools) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const model = process.env.LLM_MODEL || "deepseek-chat";

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1000,
  };
  if (tools && tools.length) body.tools = tools;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM 调用失败 (${response.status}): ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;
  const summary = message.tool_calls
    ? `[调用工具: ${message.tool_calls.map((c) => c.function?.name).join(", ")}]`
    : (message.content || "").slice(0, 150);
  console.log(`[LLM] 回复: ${summary}${summary.length > 150 ? "..." : ""}`);
  return message;
}

/**
 * 把工具执行结果整理成回传给模型的 tool 消息内容
 */
function formatToolResult(tool, result) {
  const featureCount = result.geojson
    ? result.geojson.type === "FeatureCollection"
      ? result.geojson.features.length
      : 1
    : 0;
  const layerHint = result.layerName
    ? `\n该结果已自动保存为图层「${result.layerName}」。下一步需要引用它时，把图层名「${result.layerName}」直接作为 input/inputB/clipLayer/points/polygons 等参数即可。`
    : "";
  return `[工具 ${tool} 执行结果]\n${result.summary}\nGeoJSON 特征数: ${featureCount}${layerHint}`;
}

/**
 * Agent 循环：用户消息 → LLM 推理(原生 function calling) → 工具 → 反馈 → 循环 → 最终回复
 *
 * @param {string} userMessage  用户输入
 * @param {Array} history       对话历史 [{role, content}]，首次调用传 []
 * @returns {object}            { reply, toolCalls, messages }
 */
async function chat(userMessage, history = []) {
  // 安全：系统提示词永远由服务端构建，不接受客户端传入的 system 角色消息
  const safeHistory = history.filter(m => m.role === "user" || m.role === "assistant");
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    ...safeHistory,
    { role: "user", content: userMessage },
  ];
  const toolCalls = [];
  const tools = buildToolsSchema();
  let finalReply = null;
  const MAX_STEPS = 8;

  // ---- 事件日志：会话开始 ----
  const session = logger.newSessionId();
  logger.sessionStart(session);
  logger.userQuery(session, userMessage);

  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await callLLM(messages, tools);
    messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // 没有工具调用 → 这是最终回复
      finalReply = msg.content || "";
      break;
    }

    // 执行本轮所有工具调用，把结果以 role:tool 回填
    for (const tc of msg.tool_calls) {
      if (tc.type !== "function" || !tc.function) continue;
      const name = tc.function.name;
      let params = {};
      try {
        params = JSON.parse(tc.function.arguments || "{}");
      } catch {
        params = {};
      }
      console.log(`[Agent] 第 ${step + 1} 步：调用工具 ${name}，参数 ${JSON.stringify(params)}`);

      const t0 = Date.now();
      try {
        const result = await executeTool(name, params);
        const durationMs = Date.now() - t0;
        // 立即把空间结果注册进 layer_store，供后续步骤按图层名链式引用
        if (result.geojson) {
          const layerName = layers.generateName(name);
          const featureCount = result.geojson.type === "FeatureCollection"
            ? result.geojson.features?.length ?? 1 : 1;
          layers.put(layerName, result.geojson, {
            produced_by: name,
            parents: (result.meta && result.meta.parents) || [],
            params,
          });
          result.layerName = layerName;
          // 事件日志：图层创建
          logger.layerCreated(session, layerName, name, featureCount);
        }
        toolCalls.push({ tool: name, params, result });
        messages.push({ role: "tool", tool_call_id: tc.id, content: formatToolResult(name, result) });
        // 事件日志：工具执行
        logger.toolExec(session, name, params, result.summary, durationMs, result.layerName || null);
        console.log(`[Agent] 工具 ${name} 成功 (${durationMs}ms): ${result.summary}`);
      } catch (err) {
        const durationMs = Date.now() - t0;
        console.error(`[Agent] 工具 ${name} 失败:`, err.message);
        toolCalls.push({ tool: name, params, error: err.message });
        // 事件日志：工具失败
        logger.toolExec(session, name, params, `FAILED: ${err.message}`, durationMs, null);
        messages.push({ role: "tool", tool_call_id: tc.id, content: `[工具 ${name} 执行失败] ${err.message}\n请换一种方法，或告知用户出了什么问题。` });
      }
    }
  }

  // 如果循环到上限还没有最终回复，让 LLM 总结
  if (!finalReply) {
    messages.push({ role: "user", content: "所有工具已执行完毕，请总结分析结果给用户。" });
    const msg = await callLLM(messages);
    finalReply = msg.content || "";
  }

  // ---- 事件日志：会话结束 ----
  logger.assistantReply(session, finalReply || "");
  logger.sessionEnd(session, toolCalls.length);

  return { reply: finalReply, toolCalls, messages };
}

module.exports = { chat };

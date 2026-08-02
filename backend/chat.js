const fs = require("fs");
const path = require("path");
const { listTools, executeTool } = require("./tools/registry");

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
      // 去掉 YAML frontmatter 中的 name/description 行（前面已作为索引列出）
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
 * 从文本中提取工具调用 JSON（用大括号计数，处理嵌套）
 */
function extractToolCall(text) {
  const startIdx = text.indexOf('{"tool"');
  if (startIdx === -1) return null;

  let braceCount = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === "{") braceCount++;
    if (text[i] === "}") braceCount--;
    if (braceCount === 0) {
      const jsonStr = text.slice(startIdx, i + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.tool && parsed.params) {
          return { tool: parsed.tool, params: parsed.params, jsonStr };
        }
      } catch {
        // 格式有问题，继续
      }
      break;
    }
  }
  return null;
}

/**
 * 调用 LLM API
 */
async function callLLM(messages) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const model = process.env.LLM_MODEL || "deepseek-chat";

  console.log(`[LLM] 第 ${messages.length} 条消息`);

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,   // 稍加温度，让对话更自然
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM 调用失败 (${response.status}): ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  console.log(`[LLM] 回复: ${content.slice(0, 150)}${content.length > 150 ? "..." : ""}`);
  return content;
}

/**
 * Agent 循环：用户消息 → LLM 推理 → 工具调用 → 结果反馈 → 循环 → 最终回复
 *
 * @param {string} userMessage  用户输入
 * @param {Array} history       对话历史 [{role, content}]，首次调用传 []
 * @returns {object}            { reply, toolCalls }
 */
async function chat(userMessage, history = []) {
  // 初始化消息列表：System Prompt + 历史 + 用户新消息
  if (history.length === 0) {
    history.push({ role: "system", content: buildSystemPrompt() });
  }
  const messages = [...history, { role: "user", content: userMessage }];
  const toolCalls = [];       // 本轮执行的所有工具调用记录
  let finalReply = null;

  const MAX_STEPS = 5;        // 最多循环 5 步，防止死循环

  for (let step = 0; step < MAX_STEPS; step++) {
    const content = await callLLM(messages);
    messages.push({ role: "assistant", content });

    // 尝试提取工具调用
    const toolCall = extractToolCall(content);

    if (!toolCall) {
      // 没有工具调用 → 这是最终回复
      finalReply = content;
      break;
    }

    // 执行工具
    const { tool, params } = toolCall;
    console.log(`[Agent] 第 ${step + 1} 步：调用工具 ${tool}，参数 ${JSON.stringify(params)}`);

    try {
      const result = await executeTool(tool, params);
      toolCalls.push({ tool, params, result });
      console.log(`[Agent] 工具 ${tool} 成功: ${result.summary}`);

      // 把工具结果反馈给 LLM
      messages.push({
        role: "user",
        content: `[工具 ${tool} 执行结果]\n${result.summary}\nGeoJSON 特征数: ${result.geojson ? (result.geojson.type === "FeatureCollection" ? result.geojson.features.length : 1) : 0}`,
      });
    } catch (err) {
      console.error(`[Agent] 工具 ${tool} 失败:`, err.message);
      toolCalls.push({ tool, params, error: err.message });

      // 把错误反馈给 LLM，让它换个方案
      messages.push({
        role: "user",
        content: `[工具 ${tool} 执行失败] ${err.message}\n请换一种方法，或告知用户出了什么问题。`,
      });
    }
  }

  // 如果循环到上限还没有最终回复，让 LLM 总结
  if (!finalReply) {
    messages.push({
      role: "user",
      content: "所有工具已执行完毕，请总结分析结果给用户。",
    });
    finalReply = await callLLM(messages);
    messages.push({ role: "assistant", content: finalReply });
  }

  return { reply: finalReply, toolCalls, messages };
}

module.exports = { chat };

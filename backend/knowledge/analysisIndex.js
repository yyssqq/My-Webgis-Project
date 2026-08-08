/**
 * 分析记录索引：从 events.jsonl 重建每次会话的完整分析链路
 *
 * 每个 AnalysisRecord：
 * {
 *   session: "s_xxx",
 *   query: "用户的原始问题",
 *   plan: [{ tool, label }] | null,        // AI 列出的计划步骤
 *   toolChain: [{ tool, params, durationMs, layerName, success }],
 *   layersProduced: ["buffer_5"],
 *   replyPreview: "AI最终回复摘要...",
 *   totalSteps: 2,
 *   totalDurationMs: 275,
 *   startedAt: "ISO时间",
 *   endedAt: "ISO时间"
 * }
 *
 * 用法：
 *   const records = buildAnalysisIndex()
 *   返回按时间排序的分析记录数组
 */

const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "events.jsonl");

/** 尝试从 AI 回复中提取 plan JSON */
function extractPlan(replyText) {
  const m = (replyText || "").match(/```plan\n([\s\S]*?)\n```/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[1]);
    return (p.steps || []).map(s => ({ tool: s.tool, label: s.label }));
  } catch {
    return null;
  }
}

function buildAnalysisIndex() {
  if (!fs.existsSync(EVENTS_FILE)) return [];

  const lines = fs.readFileSync(EVENTS_FILE, "utf-8").split("\n").filter(Boolean);
  const sessions = new Map(); // session → { events[] }

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const sid = event.session;
    if (!sessions.has(sid)) sessions.set(sid, []);
    sessions.get(sid).push(event);
  }

  const records = [];

  for (const [session, events] of sessions) {
    events.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

    const query = events.find(e => e.type === "user_query")?.text || "";
    const reply = events.find(e => e.type === "assistant_reply");
    const sessionEnd = events.find(e => e.type === "session_end");
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    // 工具链
    const toolExecs = events.filter(e => e.type === "tool_exec");
    const toolChain = toolExecs.map(te => ({
      tool: te.tool,
      params: te.params,
      durationMs: te.durationMs || 0,
      layerName: te.layerName || null,
      success: !(te.summary || "").startsWith("FAILED"),
      summary: te.summary || "",
    }));

    // 产出图层
    const layersProduced = events
      .filter(e => e.type === "layer_created")
      .map(e => e.layerName);

    // 提取计划
    const plan = extractPlan(reply?.preview || "") || extractPlan(
      events.filter(e => e.type === "assistant_reply")
        .map(e => e.preview || "").join(" ")
    );

    // 总耗时
    const totalDurationMs = toolChain.reduce((sum, t) => sum + t.durationMs, 0);

    records.push({
      session,
      query,
      plan,
      toolChain,
      layersProduced,
      replyPreview: (reply?.preview || reply?.text || "").slice(0, 300),
      totalSteps: sessionEnd?.totalSteps || toolChain.length,
      totalDurationMs,
      startedAt: firstEvent?.timestamp || null,
      endedAt: lastEvent?.timestamp || null,
    });
  }

  // 按时间倒序
  records.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
  return records;
}

if (require.main === module) {
  const records = buildAnalysisIndex();
  console.log(JSON.stringify(records, null, 2));
}

module.exports = { buildAnalysisIndex };

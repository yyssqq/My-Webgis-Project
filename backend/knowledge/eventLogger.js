/**
 * 事件日志模块：把每次分析操作记录为结构化 JSONL
 *
 * 设计原则：
 * - JSONL 格式（每行一个 JSON），追加写入，零依赖
 * - 每个事件都有统一的 { type, session, timestamp } 壳
 * - session 是单次 chat() 调用的唯一标识，串起所有事件
 * - 低开销：同步写文件但不阻塞（Node fs.appendFile 是异步的）
 *
 * 事件类型：
 *   session_start   会话开始
 *   user_query      用户提问
 *   plan_proposed   AI 列出的分析计划
 *   tool_exec       工具执行（一次一条）
 *   layer_created   图层保存到 layer_store
 *   assistant_reply AI 最终回复
 *   user_feedback   用户反馈（确认/取消/修改）
 *   session_end     会话结束
 */

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "events.jsonl");

// ---- 公共壳 ----
function envelope(type, session, fields = {}) {
  return JSON.stringify({ type, session, timestamp: new Date().toISOString(), ...fields }) + "\n";
}

// ---- 写入 ----
function write(line) {
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error("[eventLogger] 写入失败:", err.message);
  });
}

// ---- 公开 API ----

/** 生成唯一会话 ID */
function newSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 会话开始 */
function sessionStart(session) {
  write(envelope("session_start", session));
}

/** 用户提问 */
function userQuery(session, text) {
  write(envelope("user_query", session, { text: text.slice(0, 500) }));
}

/** AI 列出分析计划 */
function planProposed(session, plan) {
  write(envelope("plan_proposed", session, { steps: plan.steps?.map(s => ({ tool: s.tool, label: s.label })) }));
}

/** 工具执行完成 */
function toolExec(session, tool, params, resultSummary, durationMs, layerName) {
  write(envelope("tool_exec", session, {
    tool,
    params: JSON.stringify(params).slice(0, 300),
    summary: (resultSummary || "").slice(0, 200),
    durationMs,
    layerName: layerName || null,
  }));
}

/** 图层保存成功 */
function layerCreated(session, layerName, producedBy, featureCount) {
  write(envelope("layer_created", session, {
    layerName,
    producedBy,
    featureCount,
  }));
}

/** AI 最终回复 */
function assistantReply(session, replyText) {
  write(envelope("assistant_reply", session, {
    length: replyText.length,
    preview: replyText.slice(0, 200),
  }));
}

/** 用户反馈（确认/取消/修改） */
function userFeedback(session, action, text) {
  write(envelope("user_feedback", session, { action, text: (text || "").slice(0, 200) }));
}

/** 会话结束 */
function sessionEnd(session, totalSteps) {
  write(envelope("session_end", session, { totalSteps }));
}

module.exports = {
  newSessionId,
  sessionStart,
  userQuery,
  planProposed,
  toolExec,
  layerCreated,
  assistantReply,
  userFeedback,
  sessionEnd,
};

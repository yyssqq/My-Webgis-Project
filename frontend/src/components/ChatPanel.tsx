import { useEffect, useRef, useState } from "react";
import type { PlanData } from "../types";
import { PlanCard } from "./PlanCard";
import s from "./ChatPanel.module.css";

interface ChatMessageView { role: "user" | "assistant" | "system"; content: string; }
interface ChatPanelProps {
  messages: ChatMessageView[]; loading: boolean; onSend: (t: string) => void;
  onPlanConfirm: () => void; onPlanCancel: () => void;
}

function parsePlan(c: string): PlanData | null {
  const m = c.match(/```plan\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function stripPlan(c: string) { return c.replace(/```plan\n[\s\S]*?\n```/g, "").trim(); }

/** 简易 Markdown → HTML：支持表格、粗体、行内代码、换行 */
function renderMarkdown(text: string): string {
  let html = text;
  // 表格: | --- | --- | 语法
  html = html.replace(/(\|[^\n]+\|\n\|[-: |]+\|\n((?:\|.*\|\n?)*))/g, (_sub: string, table: string) => {
    const lines = table.trim().split("\n");
    const headers = lines[0].split("|").filter(Boolean).map((h: string) => h.trim());
    const alignRow = lines[1];
    const aligns = (alignRow.match(/:-+:|:-+|-+:/g) || []).map((a: string) => {
      if (a.startsWith(":") && a.endsWith(":")) return "center";
      if (a.endsWith(":")) return "right";
      return "left";
    });
    const bodyLines = lines.slice(2);
    const thead = `<thead><tr>${headers.map((h: string, i: number) => `<th style="text-align:${aligns[i] || "left"}">${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${bodyLines.map((row: string) => {
      const cells = row.split("|").filter(Boolean).map((c: string) => c.trim());
      return `<tr>${cells.map((c: string, i: number) => `<td style="text-align:${aligns[i] || "left"}">${c}</td>`).join("")}</tr>`;
    }).join("")}</tbody>`;
    return `<table>${thead}${tbody}</table>`;
  });
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 行内代码
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // 换行
  html = html.replace(/\n/g, "<br>");
  return html;
}

export function ChatPanel({ messages, loading, onSend, onPlanConfirm, onPlanCancel }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    setElapsed(0);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = () => { const t = input.trim(); if (!t || loading) return; setInput(""); onSend(t); };

  return (
    <aside className={s.panel}>
      <div className={s.header}>AI 助手</div>
      <div className={s.messages}>
        {messages.map((m, i) => {
          const plan = m.role === "assistant" ? parsePlan(m.content) : null;
          const raw = m.role === "assistant" ? stripPlan(m.content) : m.content;
          const isAssistant = m.role === "assistant" && raw.trim();
          return (
            <div key={i}>
              <div className={`${s.msg} ${m.role === "user" ? s.msgUser : m.role === "system" ? s.msgSystem : isAssistant ? s.msgAssistant : ""}`}
                dangerouslySetInnerHTML={m.role === "system" ? undefined : { __html: renderMarkdown(raw) }}>
                {m.role === "system" ? raw : undefined}
              </div>
              {plan && <PlanCard plan={plan} onConfirm={onPlanConfirm} onCancel={onPlanCancel} />}
            </div>
          );
        })}
        {loading && <div className={s.timer}>思考中... {elapsed}s</div>}
        <div ref={bottomRef} />
      </div>
      <div className={s.input}>
        <textarea className={s.textarea} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="描述你的分析需求..." />
        <button className={s.send} onClick={send} disabled={loading}>发送</button>
      </div>
    </aside>
  );
}

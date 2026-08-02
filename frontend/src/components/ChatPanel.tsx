import { useState } from "react";

interface ChatMessageView {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessageView[];
  loading: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onSend(text);
  };

  return (
    <aside
      style={{
        width: 380,
        background: "var(--bg-panel)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          fontWeight: 600,
          fontSize: 13.5,
          color: "#fff",
        }}
      >
        AI 空间分析助手
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: m.role === "system" ? "100%" : "88%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: m.role === "system" ? 11 : 13,
              lineHeight: 1.55,
              wordBreak: "break-word",
              alignSelf: m.role === "user" ? "flex-end" : m.role === "system" ? "center" : "flex-start",
              background:
                m.role === "user" ? "var(--accent)" : m.role === "system" ? "transparent" : "var(--bg-card)",
              color: m.role === "user" ? "#fff" : m.role === "system" ? "var(--text-dim)" : "var(--text)",
              textAlign: m.role === "system" ? "center" : "left",
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", color: "var(--text-dim)", fontSize: 12 }}>
            AI 正在思考...
          </div>
        )}
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入分析需求，Enter 发送。例如：分析天安门周边 5 公里"
          style={{
            flex: 1,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            padding: "10px 12px",
            fontSize: 13,
            resize: "none",
            height: 52,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            width: 56,
            background: "var(--accent)",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          发送
        </button>
      </div>
    </aside>
  );
}

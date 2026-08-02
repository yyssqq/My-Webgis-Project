import type { ViewMode } from "../types";

interface TopBarProps {
  mode: ViewMode;
  onToggle: () => void;
  wsStatus: "off" | "on" | "connecting";
}

export function TopBar({ mode, onToggle, wsStatus }: TopBarProps) {
  return (
    <header
      style={{
        height: 42,
        background: "var(--bg-panel)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid var(--border)",
        gap: 12,
        zIndex: 10,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.3px" }}>
        My<span style={{ color: "var(--accent)" }}>WebGIS</span>
      </span>
      <span
        style={{
          fontSize: 10,
          background: "var(--accent)",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 10,
          fontWeight: 600,
        }}
      >
        AI 空间分析
      </span>

      <button
        onClick={onToggle}
        style={{
          marginLeft: 8,
          padding: "4px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        {mode.kind === "2d" ? "🌐 2D 地图" : "🌍 3D 球体"}
      </button>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-dim)" }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: wsStatus === "on" ? "var(--green)" : wsStatus === "off" ? "var(--red)" : "var(--orange)",
            boxShadow: wsStatus === "on" ? "0 0 6px var(--green)" : "none",
          }}
        />
        {wsStatus === "on" ? "已连接" : wsStatus === "off" ? "未连接" : "连接中..."}
      </div>
    </header>
  );
}

import type { LayerInfo } from "../types";

interface LayerPanelProps {
  layers: LayerInfo[];
  visible: Record<string, boolean>;
  onToggleVisibility: (name: string) => void;
  onDelete: (name: string) => void;
  onPublish: (name: string) => void;
  onExport: (name: string) => void;
  publishing?: string | null;
}

function layerColor(producedBy?: string): string {
  switch (producedBy) {
    case "buffer":
      return "#e74c3c";
    case "clip":
      return "#f39c12";
    case "intersect":
    case "union":
    case "erase":
      return "#9b59b6";
    default:
      return "#2ecc71";
  }
}

export function LayerPanel({ layers, visible, onToggleVisibility, onDelete, onPublish, onExport, publishing }: LayerPanelProps) {
  return (
    <aside
      style={{
        width: 252,
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: 14,
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-dim)", fontWeight: 600 }}>
        图层
      </div>

      {layers.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 11 }}>
          暂无图层，运行分析后结果会显示在这里
        </div>
      )}

      {layers.map((l) => {
        const isVisible = visible[l.name] !== false;
        const color = layerColor(l.meta?.produced_by);
        return (
          <div
            key={l.name}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => onToggleVisibility(l.name)}
                title="显隐"
              />
              <span style={{ flex: 1, color: "#fff", fontWeight: 600, fontSize: 12.5, wordBreak: "break-all" }}>
                {l.name}
              </span>
              <span
                onClick={() => onDelete(l.name)}
                style={{ color: "var(--text-dim)", cursor: "pointer", fontSize: 13 }}
                title="删除"
              >
                ✕
              </span>
            </div>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 10.5 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                }}
              />
              <span style={{ color: "var(--text-dim)" }}>
                {l.meta?.produced_by ?? "未标记"} · {new Date(l.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button
                onClick={() => onPublish(l.name)}
                disabled={publishing === l.name}
                style={{
                  flex: 1,
                  padding: "3px 0",
                  fontSize: 10.5,
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  background: "var(--bg-panel)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {publishing === l.name ? "发布中..." : "发布 WMS"}
              </button>
              <button
                onClick={() => onExport(l.name)}
                style={{
                  flex: 1,
                  padding: "3px 0",
                  fontSize: 10.5,
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  background: "var(--bg-panel)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                导出 GeoJSON
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

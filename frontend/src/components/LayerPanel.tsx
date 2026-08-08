import type { LayerInfo } from "../types";
import s from "./LayerPanel.module.css";

interface LayerPanelProps {
  layers: LayerInfo[]; visible: Record<string, boolean>;
  onToggleVisibility: (name: string) => void; onDelete: (name: string) => void;
  onPublish: (name: string) => void; onExport: (name: string) => void;
  onZoomTo: (name: string) => void;
  publishing?: string | null;
}

export function LayerPanel({ layers, visible, onToggleVisibility, onDelete, onPublish, onExport, onZoomTo, publishing }: LayerPanelProps) {
  return (
    <aside className={s.panel}>
      <div className={s.header}>图层 <span className={s.count}>{layers.length}</span></div>
      {layers.length === 0 && <div className={s.empty}>暂无图层，运行分析后显示</div>}
      {layers.map((l) => {
        const on = visible[l.name] !== false;
        return (
          <div key={l.name} className={`${s.card} ${on ? s.cardActive : ""}`}>
            <div className={s.row}>
              <div className={`${s.check} ${on ? s.checkOn : ""}`}
                onClick={() => onToggleVisibility(l.name)} />
              <span className={s.name}>{l.name}</span>
              <span className={s.del}
                onClick={() => { if (window.confirm(`确认删除「${l.name}」？`)) onDelete(l.name); }}
                title="删除">×</span>
            </div>
            <div className={s.meta}>{l.meta?.produced_by ?? "未知"} · {new Date(l.createdAt).toLocaleTimeString()}</div>
            <div className={s.actions}>
              <button className={s.btn} onClick={() => onZoomTo(l.name)}>缩放</button>
              <button className={s.btn} onClick={() => onPublish(l.name)} disabled={publishing === l.name}>
                {publishing === l.name ? "..." : "发布"}</button>
              <button className={s.btn} onClick={() => onExport(l.name)}>导出</button>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

import type { ViewMode } from "../types";
import s from "./TopBar.module.css";

interface TopBarProps { mode: ViewMode; onToggle: () => void; wsStatus: "off" | "on" | "connecting"; }

export function TopBar({ mode, onToggle, wsStatus }: TopBarProps) {
  return (
    <header className={s.bar}>
      <span className={s.logo}>My<span>WebGIS</span></span>
      <span className={s.badge}>AI 空间分析</span>
      <div className={s.toggle}>
        <button className={`${s.toggleBtn} ${mode.kind === "2d" ? s.toggleBtnActive : ""}`}
          onClick={mode.kind === "3d" ? onToggle : undefined}>2D</button>
        <button className={`${s.toggleBtn} ${mode.kind === "3d" ? s.toggleBtnActive : ""}`}
          onClick={mode.kind === "2d" ? onToggle : undefined}>3D</button>
      </div>
      <div className={s.status}>
        <div className={`${s.dot} ${wsStatus === "on" ? s.dotOn : s.dotOff}`} />
        {wsStatus === "on" ? "已连接" : "未连接"}
      </div>
    </header>
  );
}

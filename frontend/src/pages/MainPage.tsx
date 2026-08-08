import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "../components/TopBar";
import { LayerPanel } from "../components/LayerPanel";
import { ChatPanel } from "../components/ChatPanel";
import { MapView } from "../components/MapView";
import { GlobeView } from "../components/GlobeView";
import * as api from "../api/client";
import type { OlHandle } from "../maps/openlayers";
import type { CesiumHandle } from "../maps/cesium";
import type { ViewMode, LayerInfo } from "../types";

interface ChatView { role: "user" | "assistant" | "system"; content: string; }

export default function MainPage() {
  const [mode, setMode] = useState<ViewMode>({ kind: "2d" });
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [geojson, setGeojson] = useState<Record<string, GeoJSON.GeoJsonObject>>({});
  const [chat, setChat] = useState<ChatView[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<"off" | "on" | "connecting">("connecting");
  const [publishing, setPublishing] = useState<string | null>(null);
  const olHandle = useRef<OlHandle | null>(null);
  const cesiumHandle = useRef<CesiumHandle | null>(null);
  const syncedOL = useRef<Set<string>>(new Set());
  const syncedCesium = useRef<Set<string>>(new Set());

  const syncViews = useCallback(() => {
    const names = new Set(Object.keys(geojson));
    // 2D：OL 总是存在，直接同步
    for (const n of names) {
      if (!syncedOL.current.has(n) && olHandle.current) {
        olHandle.current.addLayer(n, geojson[n]);
        syncedOL.current.add(n);
      }
    }
    for (const n of syncedOL.current) {
      if (!names.has(n)) { olHandle.current?.removeLayer(n); syncedOL.current.delete(n); }
    }
    // 3D：只在 Cesium 已初始化时同步
    if (cesiumHandle.current) {
      for (const n of names) {
        if (!syncedCesium.current.has(n)) {
          cesiumHandle.current.addLayer(n, geojson[n]);
          syncedCesium.current.add(n);
        }
      }
      for (const n of syncedCesium.current) {
        if (!names.has(n)) { cesiumHandle.current.removeLayer(n); syncedCesium.current.delete(n); }
      }
    }
    // 可见性
    for (const n of names) {
      const v = visible[n] !== false;
      olHandle.current?.setLayerVisible(n, v);
      cesiumHandle.current?.setLayerVisible(n, v);
    }
  }, [geojson, visible]);
  useEffect(() => { syncViews(); }, [syncViews]);

  // 当首次切换到 3D 时，Cesium 才被创建——此时立即把所有图层同步过去
  const handleCesiumReady = useCallback((h: CesiumHandle) => {
    cesiumHandle.current = h;
    syncedCesium.current.clear();
    // 强制触发一次同步，把所有已有图层注入 Cesium
    const names = Object.keys(geojson);
    for (const n of names) {
      if (geojson[n]) {
        h.addLayer(n, geojson[n]);
        syncedCesium.current.add(n);
        h.setLayerVisible(n, visible[n] !== false);
      }
    }
  }, [geojson, visible]);

  const refreshLayers = useCallback(async () => {
    try {
      const ls = await api.listLayers(); setLayers(ls);
      const f: Record<string, GeoJSON.GeoJsonObject> = {};
      await Promise.all(ls.map(async l => { try { f[l.name] = await api.getLayerGeoJson(l.name); } catch {} }));
      setGeojson(p => { const m: Record<string, GeoJSON.GeoJsonObject> = {}; for (const l of ls) m[l.name] = f[l.name] ?? p[l.name]; return m; });
    } catch {}
  }, []);
  useEffect(() => { refreshLayers(); }, [refreshLayers]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    const connect = () => {
      ws = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3000");
      ws.onopen = () => setWsStatus("on");
      ws.onmessage = e => { try { if (JSON.parse(e.data).type === "tool_result") refreshLayers(); } catch {} };
      ws.onclose = () => { setWsStatus("off"); setTimeout(connect, 3000); };
      ws.onerror = () => setWsStatus("off");
    };
    connect();
    return () => ws?.close();
  }, [refreshLayers]);

  const toggleMode = () => setMode(m => ({ kind: m.kind === "2d" ? "3d" : "2d" }));
  const toggleVis = (n: string) => setVisible(v => ({ ...v, [n]: !(v[n] !== false) }));
  const handleDelete = async (n: string) => { try { await api.deleteLayer(n); } catch {}; await refreshLayers(); };
  const handlePublish = async (n: string) => {
    setPublishing(n);
    try { const r = await api.publishLayer(n); olHandle.current?.addWms(r.layerName, r.wmsUrl); setChat(c => [...c, { role: "system", content: `Published: ${r.layerName}` }]); }
    catch (err) { setChat(c => [...c, { role: "system", content: "Publish failed: " + (err as Error).message }]); }
    finally { setPublishing(null); }
  };
  const handleExport = (n: string) => { api.downloadLayerGeoJson(n); };
  const handleZoomTo = async (n: string) => {
    try {
      const gj = await api.getLayerGeoJson(n);
      if (mode.kind === "2d") olHandle.current?.zoomToLayer(gj);
      else cesiumHandle.current?.zoomToLayer(gj);
    } catch {}
  };
  const handleSend = async (text: string) => {
    setChat(c => [...c, { role: "user", content: text }]); setLoading(true);
    try {
      const data = await api.sendChat(text, chat.map(({ role, content }) => ({ role, content })));
      setChat(c => [...c, { role: "assistant", content: data.reply }]);
      await refreshLayers();
    } catch (err) { setChat(c => [...c, { role: "assistant", content: "Error: " + (err as Error).message }]); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar mode={mode} onToggle={toggleMode} wsStatus={wsStatus} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <LayerPanel layers={layers} visible={visible} onToggleVisibility={toggleVis} onDelete={handleDelete}
          onPublish={handlePublish} onExport={handleExport} onZoomTo={handleZoomTo} publishing={publishing} />
        <main style={{ flex: 1, position: "relative", background: "#E8EBF0" }}>
          <button onClick={() => olHandle.current?.exportPng()} title="Export PNG" style={{
            position: "absolute", right: 12, top: 12, zIndex: 5, padding: "5px 12px",
            fontSize: "var(--text-xs)", border: "1px solid var(--border-visible)", borderRadius: "var(--radius)",
            background: "var(--bg-surface)", color: "var(--text-3)", cursor: "pointer", fontFamily: "inherit",
          }}>导出 PNG</button>
          <MapView active={mode.kind === "2d"} onReady={h => olHandle.current = h} />
          <GlobeView active={mode.kind === "3d"} onReady={handleCesiumReady} />
        </main>
        <ChatPanel messages={chat} loading={loading} onSend={handleSend}
          onPlanConfirm={() => handleSend("确认")} onPlanCancel={() => handleSend("取消")} />
      </div>
    </div>
  );
}

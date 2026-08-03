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

interface ChatView {
  role: "user" | "assistant" | "system";
  content: string;
}

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
  const synced = useRef<Set<string>>(new Set());

  // ---- 图层同步：把 geojson + visible 状态应用到两套视图 ----
  const syncViews = useCallback(() => {
    const names = new Set(Object.keys(geojson));
    for (const name of names) {
      if (!synced.current.has(name)) {
        olHandle.current?.addLayer(name, geojson[name]);
        cesiumHandle.current?.addLayer(name, geojson[name]);
        synced.current.add(name);
      }
    }
    for (const name of synced.current) {
      if (!names.has(name)) {
        olHandle.current?.removeLayer(name);
        cesiumHandle.current?.removeLayer(name);
        synced.current.delete(name);
      }
    }
    for (const name of names) {
      const v = visible[name] !== false;
      olHandle.current?.setLayerVisible(name, v);
      cesiumHandle.current?.setLayerVisible(name, v);
    }
  }, [geojson, visible]);

  useEffect(() => {
    syncViews();
  }, [syncViews]);

  // ---- 从后端加载图层列表 + GeoJSON ----
  const refreshLayers = useCallback(async () => {
    try {
      const ls = await api.listLayers();
      setLayers(ls);
      const fetched: Record<string, GeoJSON.GeoJsonObject> = {};
      await Promise.all(
        ls.map(async (l) => {
          try {
            fetched[l.name] = await api.getLayerGeoJson(l.name);
          } catch {
            /* 单层拉取失败不影响整体 */
          }
        })
      );
      setGeojson((prev) => {
        const merged: Record<string, GeoJSON.GeoJsonObject> = {};
        for (const l of ls) merged[l.name] = fetched[l.name] ?? prev[l.name];
        return merged;
      });
    } catch {
      /* 后端未连接 */
    }
  }, []);

  useEffect(() => {
    refreshLayers();
  }, [refreshLayers]);

  // ---- WebSocket：接收后端广播（工具执行结果） ----
  useEffect(() => {
    let ws: WebSocket | null = null;
    const connect = () => {
      ws = new WebSocket("ws://localhost:3000");
      ws.onopen = () => setWsStatus("on");
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === "tool_result") refreshLayers();
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setWsStatus("off");
        setTimeout(connect, 3000);
      };
      ws.onerror = () => setWsStatus("off");
    };
    connect();
    return () => ws?.close();
  }, [refreshLayers]);

  // ---- 交互 ----
  const toggleMode = () =>
    setMode((m) => ({ kind: m.kind === "2d" ? "3d" : "2d" }));

  const toggleVisibility = (name: string) =>
    setVisible((v) => ({ ...v, [name]: !(v[name] !== false) }));

  const handleDelete = async (name: string) => {
    try {
      await api.deleteLayer(name);
    } catch {
      /* ignore */
    }
    await refreshLayers();
  };

  // 发布到 GeoServer：成功后把 WMS 叠加到 2D 地图，并在聊天里提示
  const handlePublish = async (name: string) => {
    setPublishing(name);
    try {
      const r = await api.publishLayer(name);
      olHandle.current?.addWms(r.layerName, r.wmsUrl);
      setChat((c) => [
        ...c,
        { role: "system", content: `✅ 图层「${r.layerName}」已发布到 GeoServer，已叠加到 2D 地图` },
      ]);
    } catch (err) {
      setChat((c) => [...c, { role: "system", content: "❌ 发布失败: " + (err as Error).message }]);
    } finally {
      setPublishing(null);
    }
  };

  const handleExport = (name: string) => {
    api.downloadLayerGeoJson(name);
  };

  const handleSend = async (text: string) => {
    setChat((c) => [...c, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = chat.map(({ role, content }) => ({ role, content }));
      const data = await api.sendChat(text, history);
      setChat((c) => [...c, { role: "assistant", content: data.reply }]);
      await refreshLayers();
    } catch (err) {
      setChat((c) => [...c, { role: "assistant", content: "❌ " + (err as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar mode={mode} onToggle={toggleMode} wsStatus={wsStatus} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <LayerPanel
          layers={layers}
          visible={visible}
          onToggleVisibility={toggleVisibility}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onExport={handleExport}
          publishing={publishing}
        />

        <main style={{ flex: 1, position: "relative", background: "#000" }}>
          <button
            onClick={() => olHandle.current?.exportPng()}
            title="导出当前 2D 地图为 PNG"
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              zIndex: 5,
              padding: "4px 10px",
              fontSize: 11,
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-card)",
              color: "var(--text)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📸 导出 PNG
          </button>
          <MapView active={mode.kind === "2d"} onReady={(h) => (olHandle.current = h)} />
          <GlobeView active={mode.kind === "3d"} onReady={(h) => (cesiumHandle.current = h)} />
        </main>

        <ChatPanel messages={chat} loading={loading} onSend={handleSend} />
      </div>
    </div>
  );
}

// 后端 HTTP 客户端（开发期走 Vite proxy /api → :3000）
import type { ChatMessage, ChatResponse, LayerInfo, ToolMeta, ToolResult } from "../types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `请求失败: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getTools(): Promise<ToolMeta[]> {
  const data = await request<{ tools: ToolMeta[] }>("/api/tools");
  return data.tools;
}

export async function sendChat(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export async function listLayers(): Promise<LayerInfo[]> {
  const data = await request<{ layers: LayerInfo[] }>("/api/layers");
  return data.layers;
}

export async function getLayerGeoJson(name: string): Promise<GeoJSON.GeoJsonObject> {
  return request<GeoJSON.GeoJsonObject>(`/api/layers/${encodeURIComponent(name)}`);
}

export async function deleteLayer(name: string): Promise<void> {
  await request<{ success: boolean }>(`/api/layers/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function publishLayer(
  name: string
): Promise<{ wmsUrl: string; wfsUrl: string; layerName: string; summary: string }> {
  return request<{ success: boolean; wmsUrl: string; wfsUrl: string; layerName: string; summary: string }>(
    `/api/layers/${encodeURIComponent(name)}/publish`,
    { method: "POST" }
  );
}

export function downloadLayerGeoJson(name: string): void {
  const url = `/api/layers/${encodeURIComponent(name)}/export`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.geojson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function executeToolRaw(
  tool: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const data = await request<{ success: boolean; result: ToolResult }>("/api/tools", {
    method: "POST",
    body: JSON.stringify({ tool, params }),
  });
  return data.result;
}

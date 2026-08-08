// 与后端共享的类型定义（契约见 docs/api.md）

export interface ToolMeta {
  name: string;
  description: string;
}

export interface ToolResult {
  geojson?: GeoJSON.GeoJsonObject;
  summary: string;
  meta?: {
    produced_by: string;
    parents: string[];
    params: Record<string, unknown>;
  };
}

export interface ToolCallRecord {
  tool: string;
  params: Record<string, unknown>;
  result?: ToolResult;
  error?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  toolCalls: ToolCallRecord[];
  messages: ChatMessage[];
}

export interface LayerInfo {
  name: string;
  meta: {
    produced_by?: string;
    parents?: string[];
    params?: Record<string, unknown>;
  };
  createdAt: string;
}

export interface ViewMode {
  kind: "2d" | "3d";
}

export interface PlanStep {
  id: number;
  label: string;
  tool: string;
}

export interface PlanData {
  title: string;
  steps: PlanStep[];
}

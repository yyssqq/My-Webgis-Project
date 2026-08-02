# 架构设计

## 1. 系统定位

基于 AI Agent 的 WebGIS 空间分析平台。用户用自然语言提出空间分析需求，系统理解需求、
规划分析方案（工具组合）、确认后执行并渲染到地图/球体上。

## 2. 整体架构

```
┌─────────────────────────── 前端 (React + Vite + TS) ───────────────────────────┐
│  TopBar / LayerPanel / ChatPanel / MapView(OL 2D) / GlobeView(Cesium 3D)        │
└──────────────┬──────────────────────────────────────────────────────────────────┘
               │ HTTP (/api/*) + WebSocket
┌──────────────▼──────────────────────────────────────────────────────────────────┐
│  后端 (Node.js + Express + ws)                                                   │
│  ├─ server.js     路由装配 / 静态服务 / WebSocket 广播                            │
│  ├─ chat.js       Agent 循环(LLM 推理 → 工具 → 反馈)                            │
│  ├─ tools/        工具注册器 + 按类目分组的 GIS 工具(turf)                       │
│  ├─ layers/       layer_store:图层资产 + 元数据(血统)                           │
│  ├─ compute/      Python 侧车客户端(stub,预留)                                  │
│  ├─ skills/       技能手册(喂给 LLM 的领域知识)                                 │
│  └─ experts/      [阶段C] 专家目录                                               │
└──────┬───────────────┬──────────────────────────────────────────────────────────┘
       │               │ HTTP
       │ GeoServer     ▼
       │ (WMS/WFS)    Python 计算侧车 [预留:FastAPI+geopandas/rasterio]
```

## 3. 数据流：一次自然语言分析

```
用户消息
  → chat.js: 组装 System Prompt(skills 手册 + 工具清单)
  → LLM 推理
  → [阶段B] propose_plan 产出结构化方案 → 用户确认
  → 执行器按依赖顺序调用 tools/*
  → 中间/最终结果写入 layers/layer_store
  → WebSocket 广播 → 前端渲染到 MapView/GlobeView + LayerPanel 列出图层
  → [可选] 发布到 GeoServer WMS
```

## 4. 模块职责

| 模块 | 职责 | 依赖 |
|---|---|---|
| server.js | 路由、CORS、静态服务、WS 广播 | express, ws |
| chat.js | Agent 循环、LLM 调用、skills 加载 | fetch, tools |
| tools/registry.js | 工具注册、按名查找、执行 | tools/* |
| tools/* | 具体 GIS 计算（turf） | @turf/turf |
| layers/store.js | 图层增删查、元数据、持久化 | fs |
| compute/client.js | Python 侧车 HTTP 客户端（stub） | fetch |
| frontend/maps/* | OL/Cesium 封装 | openlayers, cesium |

## 5. 关键技术决策（详见 docs/adr/）

- ADR-0001：前端 React + Vite + TypeScript
- ADR-0002：双地图视图（OL 2D + Cesium 3D）
- ADR-0003：Python 计算侧车接口预留
- ADR-0004：工具输出统一 GeoJSON + 血统元数据

## 6. 部署

- 开发：Vite dev server（:5173，proxy /api → :3000）+ Node 后端（:3000）+ GeoServer（:8080）
- 生产：`vite build` 产出 `frontend/dist`，由后端 `express.static` 服务

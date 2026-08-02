# 设计文档：Phase 0 工程化起步 + 阶段 A：GIS 分析工具扩容

- 日期：2026-08-02
- 项目：my-webgis-project
- 状态：已获用户批准

## 1. 背景与目标

在现有 AI Agent WebGIS（Node/Express + Cesium + turf + LLM）基础上，按完整软件工程规范
推进。本设计覆盖两个阶段：

- **Phase 0 工程化起步**：文档集、代码规范、技术栈定案、前端页面设计先行、目录重构。
- **阶段 A**：GIS 分析工具扩容（ArcGIS 风格，约 20 个矢量工具）+ 图层管理器 +
  GeoServer 发布打通 + 工具测试。

后续阶段 B（NL 编排引擎）、阶段 C（专家系统）各走独立 spec→plan→实现流程。

## 2. 技术栈（已确认）

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Node.js + Express + ws（保留） | 已有 API/WS/AI 编排 |
| 计算引擎 | turf.js（矢量基础） | 轻量、纯 JS |
| 计算侧车 | Python 侧车**接口预留**（`backend/compute/client.js` stub） | 后期栅格/进阶分析挂载，Node 通过 HTTP 调用 |
| 前端 | React 18 + Vite + TypeScript | 工程化、生态最全、GIS 示例多 |
| 地图 | OpenLayers 2D（分析/绘图）+ Cesium 3D（展示） | 双视图各取所长 |
| 测试/规范 | Vitest + ESLint + Prettier | 标准工程化工具链 |
| 版本管理 | Git Conventional Commits + `main`/`feat/*` 分支 | 规范提交历史 |

## 3. 目录结构

见 `docs/architecture.md`。要点：

- `backend/tools/` 按 ArcGIS 类目分组（overlay/proximity/statistics/extraction/geoprocessing）
- `backend/layers/`：layer_store（图层资产 + 元数据/血统）
- `backend/compute/client.js`：Python 侧车客户端 stub
- `backend/experts/`：阶段 C 预留
- `frontend/src/`：pages/components/maps/api/state 分模块

## 4. 前端页面设计

主页面三栏布局：

```
┌─────────────────────────────────────────────────────┐
│ TopBar: 品牌 | 双视图切换(2D/3D) | 连接状态           │
├──────────┬──────────────────────────┬───────────────┤
│ 左栏      │ 中栏                     │ 右栏           │
│ 图层管理器 │ 地图(OpenLayers)         │ AI 聊天       │
│ - 列表     │ / 球体(Cesium)          │ - 消息流       │
│ - 显隐     │                         │ - 输入框       │
│ - 透明度    │                         │ (阶段B:计划卡) │
│ - 顺序/删除 │                         │ (阶段C:@专家)  │
└──────────┴──────────────────────────┴───────────────┘
```

本阶段实现：三栏 + 双视图 + 图层管理器。阶段 B/C 只留布局占位。

## 5. 阶段 A 工具清单（20 个）

| 类别 | 工具 |
|---|---|
| Overlay | intersect、union、erase、symmetricDifference |
| Proximity | buffer(已有)、multipleRingBuffer、nearest、thiessen |
| Statistics | summarize、calculateGeometry（面积/长度/质心） |
| Extraction | clip、selectByLocation、selectByAttributes、filter |
| Geoprocessing | dissolve、spatialJoin、merge、geocode(已有)、reverseGeocode、randomPoints |

工具契约：

```ts
interface Tool {
  name: string;
  description: string;
  params: Record<string, any>;
  execute(params): { geojson?: GeoJSON, summary: string, meta?: { produced_by, parents, params } };
}
```

## 6. 图层管理器

- 后端 `layer_store`：`{name, geojson, meta{produced_by, parents, params}, createdAt}`
- REST：`GET/POST/DELETE/PATCH /api/layers`
- 前端 LayerPanel 与后端实时同步；多中间层可叠加（阶段 B 计划执行的基础）

## 7. GeoServer 发布

- 修 `publish.js`：改用 GeoServer REST 直接上传 GeoJSON（替代有兼容问题的 shp-write）
- 工具结果可选"一键发布为 WMS"

## 8. 测试

- `backend/tests/*.test.js`：每个工具 ≥1 个断言用例
- 前端组件冒烟测试（Vitest + Testing Library）

## 9. 里程碑

- M0 脚手架：Vite+React+TS 迁移、ESLint/Prettier、docs 骨架、AGENTS.md
- M1 前端主页面：三栏 + 双视图 + 图层管理器骨架
- M2 工具层：20 工具 + layer_store + 测试
- M3 GeoServer 发布 + 结果导出
- M4 端到端验收

## 10. 范围外（YAGNI）

- 栅格分析（坡度/视域/插值）——留给 Python 侧车阶段
- 前端框架不做 SSR/状态管理库（React 内置状态够用，必要时再引 zustand）
- 用户系统/权限——不在本期

# 技术栈

| 层 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 运行时 | Node.js | ≥ 18（`.nvmrc` 锁定 20） | 后端 + 前端工具链 |
| 后端框架 | Express | 5.x | HTTP 服务 |
| WebSocket | ws | 8.x | 实时广播 |
| GIS 矢量 | @turf/turf | 7.x | 空间分析工具 |
| GIS 服务 | GeoServer | 3.0.0（runtime/） | WMS/WFS 发布 |
| 前端框架 | React | 18 | UI |
| 构建 | Vite | 5/6 | 开发/打包 |
| 语言 | TypeScript | 5.x | 前端类型安全 |
| 地图 2D | OpenLayers | 10.x | 分析/绘图 |
| 地图 3D | Cesium | 1.14x | 展示 |
| 测试 | Vitest | 2.x | 单元/断言 |
| 规范 | ESLint + Prettier | 9.x / 3.x | 代码风格 |

## 选型理由

- **React + Vite + TS**：生态最全、GIS 示例多、类型安全利于长期维护。
- **OpenLayers + Cesium 双视图**：OL 2D 矢量编辑/绘图/标绘强，Cesium 3D 展示全球/地形，各取所长。
- **Node + turf 起步，Python 侧车预留**：保留现有 Node 后端；栅格/拓扑稳健/插值等进阶分析
  后期由 Python（geopandas/rasterio）微服务承担，Node 通过 HTTP 调用。
- **GeoServer**：现有 runtime/ 已部署，负责 WMS/WFS 发布。

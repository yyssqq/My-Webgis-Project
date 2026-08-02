# AGENTS.md — 项目工程约定（AI 协作者必读）

## 项目

基于 AI Agent 的 WebGIS 空间分析平台（学习项目，Node + React 全栈 + LLM）。

## 常用命令

- 后端启动：`cd backend && node --env-file .env server.js`（端口 3000）
- 前端开发：`cd frontend && npm run dev`（Vite，端口 5173，proxy /api → 3000）
- 测试：`cd backend && npm test`；`cd frontend && npm test`
- 代码检查：`cd frontend && npm run lint`
- GeoServer：`cd runtime && bin/startup.sh`（端口 8080）

## 技术栈速览

后端 Node/Express + ws + turf；前端 React + Vite + TS + OpenLayers(2D) + Cesium(3D)；
GeoServer 发布 WMS/WFS；LLM 走 OpenAI 兼容接口（deepseek）。详见 docs/tech-stack.md。

## 关键约定

- 工具开发：`backend/tools/<类目>/<name>.js` 导出 `{name, description, execute}`，
  到 `tools/registry.js` 注册；输出遵守 ADR-0004（GeoJSON + 血统 meta）
- 图层：一律经 `backend/layers/store.js`（layer_store）存取，不传裸数据
- 提交：Conventional Commits；分支 `main` + `feat/*`；不提交 `.env`/密钥
- 文档：架构/技术栈/API/规范在 `docs/`，改接口必同步 docs/api.md
- 参考成熟实现：geo-harness（同构的 Python 版参考项目）

## 约定 TODO 与范围外

- 阶段 B（NL 编排）、阶段 C（专家系统）尚未实现，勿假设其 API 存在
- Python 计算侧车仅预留接口（backend/compute/client.js stub），未实现

# ADR-0001：前端采用 React + Vite + TypeScript

- 状态：已接受
- 日期：2026-08-02

## 背景

前端原为单个 `index.html`（378 行内联 JS + Cesium），无构建、无类型、难维护。

## 决策

采用 React 18 + Vite + TypeScript。

## 理由

- 生态最全，GIS 相关示例/组件最多
- Vite 开发体验快，内置 TS/ESM/HMR
- TypeScript 适合长期演进的工程化项目
- 用户明确要求使用前端框架

## 后果

- 需要从内联脚本迁移到组件化结构
- 增加构建步骤（vite build）与依赖体积

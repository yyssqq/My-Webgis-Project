# 开发计划

## 现状（截至 2026-08-02）

已完成代码（git 5 个 commit）：Node/Express 后端骨架、Cesium 3D 前端、turf 三个工具
（geocode/buffer/distance）、AI Agent 循环（chat.js）、skills 手册加载、GeoServer 已部署
（runtime/）但发布功能被注释禁用。

## 三阶段路线

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 0 | 工程化起步：文档/规范/技术栈/前端框架迁移 | ✅ 完成 |
| 阶段 A | GIS 工具扩容（20 个矢量工具）+ 图层管理器 + GeoServer 发布 | 进行中（图层管理器已就绪） |
| 阶段 B | NL 编排引擎：function calling + propose_plan + 确认 + 执行器 | 部分完成（原生 function calling 已落地，propose_plan/计划卡片 UI 待做） |
| 阶段 C | 专家系统：@调用 + 知识库 + 讨论收敛 + 前端专家页/绘图 | 未开始 |

每阶段独立走「spec → plan → 实现 → 验收」。

## 阶段 A 里程碑

- M0 脚手架：Vite+React+TS、ESLint/Prettier、docs、AGENTS.md ✅
- M1 前端主页面：三栏 + 双视图 + 图层管理器骨架 ✅
- M2 工具层：20 工具 + layer_store + 测试（当前进度：3/20 工具 + layer_store ✅，原生 function calling ✅）
- M3 GeoServer 发布 + 结果导出
- M4 端到端验收

## 参考

- 原 `开发计划.md`：初始 8 阶段学习计划（OpenLayers 版，已被技术栈演进取代）
- geo-harness：成熟的同构参考项目（Python 后端 + NL 编排 + 技能体系）

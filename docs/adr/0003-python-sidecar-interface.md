# ADR-0003：Python 计算侧车接口预留

- 状态：已接受
- 日期：2026-08-02

## 背景

turf.js 是矢量库，无法做栅格分析（坡度/山影/视域/插值），且复杂几何 overlay 存在拓扑坑。
参考 geo-harness（Python 后端）已验证 Python 生态（geopandas/rasterio）的能力上限。

## 决策

阶段 A 以 Node + turf 实现矢量工具；同时在 `backend/compute/client.js` 预留 Python 计算
侧车的 HTTP 客户端接口（stub）。后期实现一个 FastAPI + geopandas/rasterio 微服务，
Node 通过 HTTP 调用其计算端点。

## 理由

- 保留现有 Node 后端，避免重写
- 为进阶/栅格能力留出清晰的挂载点
- 公司机离线部署的 Python 环境由 pack-skills 覆盖

## 后果

- `compute/client.js` 需要定义稳定的计算服务接口约定
- 阶段 A 不实现侧车本体（YAGNI）

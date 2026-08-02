# ADR-0004：工具输出统一 GeoJSON + 血统元数据

- 状态：已接受
- 日期：2026-08-02

## 背景

阶段 B（NL 编排）需要工具链传递中间层；阶段 C 需要引用分析来源。工具输出必须可被
后续步骤引用并追溯。

## 决策

每个工具 `execute(params)` 返回：

```ts
{
  geojson?: GeoJSON,          // 空间结果（可选，如 distance 无空间结果）
  summary: string,            // 面向用户/LLM 的结果摘要
  meta: {
    produced_by: string,      // 工具名
    parents: string[],        // 输入图层名（血统）
    params: object,           // 本次调用的参数
  }
}
```

图层写入 `layer_store` 时补充：`kind/featureCount/sizeBytes/createdAt`。

## 理由

- GeoJSON 是 OL/Cesium/GeoServer 通用的交换格式
- 血统元数据支持阶段 B 依赖执行与阶段 C 引用追溯

## 后果

- 所有工具需遵守统一契约（由 registry 校验）
- 工具必须通过 layer_store 存取图层，而非直传裸数据

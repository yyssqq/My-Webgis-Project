const layers = require("../../layers/store");

/**
 * 元工具：列出当前可用的图层（供 agent 决定如何引用既有结果做链式分析）
 */
function execute() {
  const list = layers.list();
  if (list.length === 0) {
    return { summary: "当前没有可用图层。先用 geocode/buffer 等工具生成结果，再链式分析。" };
  }
  const lines = list
    .map((l) => {
      const p = l.meta.params || {};
      const paramStr = Object.entries(p)
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(", ");
      return `  - 「${l.name}」（来源: ${l.meta.produced_by || "未知"}，参数: ${paramStr || "无"}，父图层: ${(l.meta.parents || []).join(",") || "无"}）`;
    })
    .join("\n");
  return {
    layers: list,
    summary: `当前可用图层 ${list.length} 个：\n${lines}\n后续工具把「图层名」作为 input/inputB/clipLayer 等参数即可引用。`,
    meta: { produced_by: "list_layers" },
  };
}

module.exports = {
  name: "list_layers",
  description: "列出当前可用的分析图层及其来源，供链式分析时引用图层名",
  execute,
};

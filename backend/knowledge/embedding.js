/**
 * Embedding 生成：为分析记录生成语义向量/指纹，用于相似度检索
 *
 * 当前实现：关键词 + 工具链 组成结构化的 "fingerprint" 对象
 *   { keywords: string[], tools: string[] }
 *
 * 后续升级：可调用 DeepSeek / OpenAI Embeddings API 生成 1024 维稠密向量
 *   只需替换 generateEmbedding() 实现即可，不影响 Phase 3 的检索接口。
 *
 * 用法：
 *   const fp = generateFingerprint("天安门周边5公里", [{tool:"geocode"},{tool:"buffer"}])
 *   saveEmbeddings(records) → 写入 knowledge/embeddings.json
 */

const fs = require("fs");
const path = require("path");

const EMBEDDINGS_FILE = path.join(__dirname, "embeddings.json");

// ---- 中文分词（简易版：按常见 GIS 词表切分） ----
const GIS_KEYWORDS = [
  "缓冲区", "距离", "叠加", "裁剪", "统计", "范围内", "周边", "辐射",
  "选址", "学校", "医院", "公园", "地铁", "公交", "设施", "人口",
  "分析", "查询", "计算", "生成", "天安门", "北京", "上海", "成都",
  "地理编码", "geocode", "buffer", "intersect", "union", "erase",
  "clip", "summarize", "dissolve", "merge", "selectByLocation",
];

function extractKeywords(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const kw of GIS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      found.push(kw);
    }
  }
  // 如果没有命中词表，拆成单个字/词
  if (found.length === 0) {
    return text.split(/[\s，,、]+/).filter(w => w.length > 0).slice(0, 8);
  }
  return [...new Set(found)];
}

/** 从分析记录生成指纹 */
function generateFingerprint(query, toolChain) {
  const keywords = extractKeywords(query || "");
  const tools = [...new Set((toolChain || []).map(t => t.tool).filter(Boolean))];
  return { keywords, tools };
}

/** 计算两个指纹的相似度 (0~1) */
function fingerprintSimilarity(fp1, fp2) {
  const k1 = new Set(fp1.keywords || []);
  const k2 = new Set(fp2.keywords || []);
  const t1 = new Set(fp1.tools || []);
  const t2 = new Set(fp2.tools || []);

  // Jaccard 相似度：交集 / 并集
  const kIntersect = [...k1].filter(k => k2.has(k)).length;
  const kUnion = new Set([...k1, ...k2]).size;
  const tIntersect = [...t1].filter(t => t2.has(t)).length;
  const tUnion = new Set([...t1, ...t2]).size;

  const kSim = kUnion > 0 ? kIntersect / kUnion : 0;
  const tSim = tUnion > 0 ? tIntersect / tUnion : 0;

  // 关键词权重 0.6，工具链权重 0.4
  return kSim * 0.6 + tSim * 0.4;
}

/** 给分析记录加上 fingerprint 字段 */
function annotateRecords(records) {
  return records.map(r => ({
    ...r,
    fingerprint: generateFingerprint(r.query, r.toolChain),
  }));
}

/** 保存 embeddings 到磁盘 */
function saveEmbeddings(records) {
  const annotated = annotateRecords(records);
  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(annotated, null, 2), "utf-8");
  return annotated;
}

/** 从磁盘加载 embeddings */
function loadEmbeddings() {
  if (!fs.existsSync(EMBEDDINGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

module.exports = {
  generateFingerprint,
  fingerprintSimilarity,
  annotateRecords,
  saveEmbeddings,
  loadEmbeddings,
};

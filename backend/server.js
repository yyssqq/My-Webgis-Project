const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const { listTools, executeTool } = require("./tools/registry");
const { chat } = require("./chat");
const publish = require("./tools/publish");
const layers = require("./layers/store");

const app = express();
const server = http.createServer(app);

// ===== 中间件 =====

// 解析 JSON 请求体（限制 10MB，防止大文件攻击）
app.use(express.json({ limit: "10mb" }));

// CORS 白名单
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000").split(",").map(s => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// API Key 认证中间件（健康检查、OPTIONS 除外）
const API_KEY = process.env.ADMIN_API_KEY || "";
function authGuard(req, res, next) {
  if (req.path === "/api/health") return next();
  if (req.method === "OPTIONS") return next();

  // 开发模式：无 ADMIN_API_KEY 时放行所有请求
  if (!API_KEY) {
    return next();
  }

  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "未授权：缺少有效的 x-api-key" });
  }
  next();
}
app.use(authGuard);

// 请求限流：/api/chat 每分钟最多 10 次
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "请求太频繁，请稍后再试" },
});
app.use("/api/chat", chatLimiter);

// 全局限流：其他 API 每分钟 60 次
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));

// 提供前端静态文件（Cesium 需要 HTTP 访问）
app.use(express.static(path.join(__dirname, "..", "frontend")));

// 代理 /geoserver → 本机 GeoServer（同源，规避浏览器跨域；生产/开发都走这里）
// 注意：Express 挂载后 req.url 是剩余路径(去掉了 /geoserver)，这里补回前缀
app.use(
  "/geoserver",
  createProxyMiddleware({
    target: "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: { "^/": "/geoserver/" },
  })
);

// ===== HTTP 接口 =====

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 接收地图点击坐标
app.post("/api/click", (req, res) => {
  const { lng, lat } = req.body;
  console.log(`收到点击坐标: 经度=${lng}, 纬度=${lat}`);

  // 把坐标广播给所有 WebSocket 客户端
  const msg = JSON.stringify({ type: "click", lng, lat });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });

  res.json({ success: true, lng, lat, totalClicks: clickHistory.length });
});

// 获取所有可用工具列表
app.get("/api/tools", (req, res) => {
  res.json({ tools: listTools() });
});

// 执行 GIS 工具
app.post("/api/tools", async (req, res) => {
  const { tool, params } = req.body;
  try {
    const result = await executeTool(tool, params);
    console.log(`工具 ${tool} 执行成功: ${result.summary}`);

    // 把结果注册进 layer_store（供后续步骤引用/图层面板展示）
    if (result.geojson) {
      const name = layers.generateName(tool);
      layers.put(name, result.geojson, {
        produced_by: tool,
        parents: Array.isArray(params?.input_layers) ? params.input_layers : [],
        params,
      });
      result.layerName = name;
    }

    // 通过 WebSocket 广播结果给所有客户端
    const broadcast = JSON.stringify({ type: "tool_result", tool, result });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(broadcast);
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ===== 图层接口（layer_store） =====

// 列出全部图层元信息
app.get("/api/layers", (req, res) => {
  res.json({ layers: layers.list() });
});

// 获取指定图层的 GeoJSON
app.get("/api/layers/:name", (req, res) => {
  const layer = layers.get(req.params.name);
  if (!layer) return res.status(404).json({ error: `图层不存在: ${req.params.name}` });
  res.json(layer.geojson);
});

// 直接注册一个图层
app.post("/api/layers", (req, res) => {
  const { name, geojson, meta } = req.body || {};
  if (!name || !geojson) return res.status(400).json({ error: "需要 name 和 geojson" });
  const layer = layers.put(name, geojson, meta);
  res.json({ success: true, layer });
});

// 重命名图层
app.patch("/api/layers/:name", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "需要新 name" });
  const ok = layers.rename(req.params.name, name);
  if (!ok) return res.status(404).json({ error: `图层不存在: ${req.params.name}` });
  res.json({ success: true });
});

// 删除图层
app.delete("/api/layers/:name", (req, res) => {
  const ok = layers.remove(req.params.name);
  if (!ok) return res.status(404).json({ error: `图层不存在: ${req.params.name}` });
  res.json({ success: true });
});

// 发布图层到 GeoServer WMS/WFS
app.post("/api/layers/:name/publish", async (req, res) => {
  const layer = layers.get(req.params.name);
  if (!layer) return res.status(404).json({ error: `图层不存在: ${req.params.name}` });
  try {
    const result = await publish.execute({ layerName: layer.name, geojson: layer.geojson });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出图层（GeoJSON 下载）
app.get("/api/layers/:name/export", (req, res) => {
  const layer = layers.get(req.params.name);
  if (!layer) return res.status(404).json({ error: `图层不存在: ${req.params.name}` });
  res.setHeader("Content-Type", "application/geo+json");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(layer.name)}.geojson"`);
  res.send(JSON.stringify(layer.geojson));
});

// AI Agent 对话
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;

  try {
    // 调用 Agent 循环：推理 → 工具 → 反馈 → 循环 → 最终回复
    const { reply, toolCalls, messages } = await chat(message, history || []);

    // 把工具执行结果通过 WebSocket 广播（前端可以直接渲染到地图）
    for (const tc of toolCalls) {
      if (tc.result && tc.result.geojson) {
        // chat.js 已在循环内把结果注册进 layer_store 并设置 layerName，这里只负责广播
        const broadcast = JSON.stringify({ type: "tool_result", tool: tc.tool, result: tc.result });
        wss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(broadcast);
        });

        // 发布到 GeoServer（Shapefile 转换待修复）
        // TODO: 等 shp-write 兼容后再启用
        // try {
        //   const pubResult = await publish.execute({ layerName: `${tc.tool}_result`, geojson: tc.result.geojson });
        //   tc.result.wmsUrl = pubResult.wmsUrl;
        // } catch (pubErr) { console.error("[publish] 发布失败:", pubErr.message); }
      }
    }

    res.json({ reply, toolCalls, messages });
  } catch (err) {
    console.error("[chat] 错误:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== WebSocket =====

// 只保留最近 200 条点击记录，防止内存无限制增长
const clickHistory = [];
const MAX_CLICK_HISTORY = 200;
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("新客户端已连接");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "click") {
        clickHistory.push({ lng: msg.lng, lat: msg.lat, time: new Date().toISOString() });
        if (clickHistory.length > MAX_CLICK_HISTORY) clickHistory.shift();

        const broadcast = JSON.stringify({
          type: "click",
          lng: msg.lng,
          lat: msg.lat,
          totalClicks: clickHistory.length,
        });
        wss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(broadcast);
        });
      }
    } catch {
      // 非 JSON 消息静默忽略（不回显，避免信息泄露）
    }
  });

  ws.on("close", () => {
    console.log("客户端已断开");
  });

  ws.send(JSON.stringify({
    type: "welcome",
    message: "WebSocket 连接成功！",
  }));
});

// ===== 启动 =====

const PORT = process.env.PORT || 3000;

// 优雅退出：SIGTERM 时关闭服务器和所有 WS 连接
process.on("SIGTERM", () => {
  console.log("[server] 收到 SIGTERM，开始优雅退出...");
  wss.clients.forEach((c) => c.close());
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[server] 收到 SIGINT，开始优雅退出...");
  wss.clients.forEach((c) => c.close());
  server.close(() => process.exit(0));
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  if (!API_KEY) console.warn("[auth] ⚠️ 未配置 ADMIN_API_KEY，所有请求将被放行（仅开发模式）");
});

const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const { listTools, executeTool } = require("./tools/registry");
const { chat } = require("./chat");
const publish = require("./tools/publish");
const layers = require("./layers/store");

const app = express();
const server = http.createServer(app);

// ===== 中间件 =====

// 解析 JSON 请求体（让后端能读懂前端 fetch 发来的 JSON 数据）
app.use(express.json());

// CORS 跨域
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 提供前端静态文件（Cesium 需要 HTTP 访问）
app.use(express.static(path.join(__dirname, "..", "frontend")));

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

const clickHistory = [];
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("新客户端已连接");

  // 收到消息时解析
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log("WebSocket 收到:", msg);

      // 如果是客户端发来的坐标
      if (msg.type === "click") {
        clickHistory.push({ lng: msg.lng, lat: msg.lat, time: new Date().toISOString() });

        // 广播给所有客户端
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
      ws.send(`收到文本消息: ${data.toString()}`);
    }
  });

  ws.on("close", () => {
    console.log("客户端已断开");
  });

  ws.send(JSON.stringify({
    type: "welcome",
    message: "WebSocket 连接成功！",
    history: clickHistory,
  }));
});

// ===== 启动 =====

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

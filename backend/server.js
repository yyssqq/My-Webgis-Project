const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);

// ===== 中间件 =====

// 解析 JSON 请求体（让后端能读懂前端 fetch 发来的 JSON 数据）
app.use(express.json());

// CORS 跨域：允许浏览器从 file:// 打开的文件也能请求 localhost:3000
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

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

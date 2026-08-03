# API 契约

所有接口返回 JSON。开发期前端走 Vite proxy：`/api/*` → `http://localhost:3000`。
生产期前端静态资源由后端服务。

## 现有接口

### GET /api/health
```json
{ "status": "ok", "time": "ISO8601" }
```

### GET /api/tools
```json
{ "tools": [{ "name": "buffer", "description": "..." }] }
```

### POST /api/tools
```json
// 请求
{ "tool": "buffer", "params": { "lng": 116.4, "lat": 39.9, "distance": 5 } }
// 响应
{ "success": true, "result": { "geojson": {...}, "summary": "..." } }
```

### POST /api/chat
```json
// 请求
{ "message": "分析天安门周边5公里", "history": [{ "role": "system", "content": "..." }] }
// 响应
{ "reply": "...", "toolCalls": [{ "tool": "buffer", "params": {...}, "result": {...} }], "messages": [...] }
```

### GET /api/click · POST /api/click
地图点击坐标记录/广播。响应 `{ success, lng, lat, totalClicks }`。

## 图层接口（阶段 A 新增）

### GET /api/layers
列出全部图层。响应：
```json
{ "layers": [{ "name": "天安门5km", "meta": { "produced_by": "buffer", "parents": [] }, "createdAt": "ISO" }] }
```
（GeoJSON 体积大时不随列表返回，按名单独取）

### GET /api/layers/:name
返回该图层的 GeoJSON。

### POST /api/layers
```json
// 请求
{ "name": "xx", "geojson": {...}, "meta": { "produced_by": "buffer", "parents": [] } }
// 响应
{ "success": true, "layer": {...} }
```

### PATCH /api/layers/:name
重命名/更新元数据。请求 `{ "name"?, "meta"? }`。

### DELETE /api/layers/:name
删除图层。响应 `{ "success": true }`。

### POST /api/layers/:name/publish
把图层发布到 GeoServer（GeoJSON → shapefile → REST 上传，WMS/WFS）。
响应 `{ "success": true, "wmsUrl": "/geoserver/mywebgis/wms", "wfsUrl": "...", "layerName": "..." }`。

### GET /api/layers/:name/export
下载该图层的 GeoJSON 文件（`Content-Disposition: attachment`）。

## GeoServer 代理

- `/geoserver/*` 由后端代理到 `http://localhost:8080/geoserver/*`（同源，规避浏览器跨域）。
- 前端 WMS 地址用相对路径 `/geoserver/{workspace}/wms`。
- 发布机制：`@mapbox/shp-write` 生成 shapefile zip → `PUT /rest/workspaces/{ws}/datastores/{ds}/file.shp?configure=all` 自动建库并发布。

## WebSocket 消息

| type | payload | 说明 |
|---|---|---|
| welcome | `{ message, history }` | 连接建立 |
| click | `{ lng, lat, totalClicks }` | 点击坐标广播 |
| tool_result | `{ tool, result }` | 工具执行结果广播（前端渲染） |

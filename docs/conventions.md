# 开发规范（Conventions）

## 1. 通用

- 代码注释写"为什么"，不写"是什么"；少用术语，用到就解释
- 文件/函数命名：后端 JS 用 camelCase；前端组件用 PascalCase；目录用小写
- 不做与当前目标无关的重构

## 2. TypeScript / JavaScript

- 前端 TS 开启 `strict`
- 后端 JS 用 CommonJS（沿用现状，不强制迁移 TS）
- 统一 `import` 顺序、2 空格缩进、单引号（由 ESLint + Prettier 强制）

## 3. Git 规范

- 分支：`main`（稳定）+ `feat/*`（功能）+ `fix/*`（修复）
- 提交信息遵循 Conventional Commits：
  - `feat: 新增 xxx 工具`
  - `fix: 修复 xxx`
  - `docs: 更新 xxx 文档`
  - `refactor: 重构 xxx`
  - `test: 新增 xxx 测试`
- 提交前自查：只提交相关文件，不提交密钥/`.env`/`node_modules`

## 4. 目录规范

```
backend/
  tools/          按类目分组：overlay/ proximity/ statistics/ extraction/ geoprocessing/
  layers/         layer_store
  compute/        Python 侧车客户端
  skills/         技能手册（喂 LLM）
  experts/        [阶段C]
frontend/src/
  pages/          页面级组件
  components/     通用/业务组件
  maps/           地图封装（openlayers.ts / cesium.ts）
  api/            HTTP 客户端
  state/          状态
```

## 5. 工具开发约定

- 每个工具：`{name, description, params, execute}`，导出 `{name, description, execute}`
- 新增工具两步：① 在对应类目目录建文件 ② 在 `registry.js` 注册
- 输出遵守 ADR-0004（GeoJSON + 血统）
- 每个工具至少 1 个断言测试

## 6. 测试

- 后端：Vitest，`backend/tests/*.test.js`
- 前端：Vitest + Testing Library
- 提交前运行：`npm test`（后端）+ `npm run lint`

## 7. 环境

- `.nvmrc` 锁定 Node 版本
- 密钥只放 `.env`（已 gitignore），不提交

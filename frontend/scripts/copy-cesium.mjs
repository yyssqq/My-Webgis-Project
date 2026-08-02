// 将 Cesium 的静态资源（Widgets/Workers/Assets 等）复制到 public/cesium，
// 供运行时以 CESIUM_BASE_URL=/cesium/ 加载。
import { copyFileSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const dest = join(__dirname, "..", "public", "cesium");

rmSync(dest, { recursive: true, force: true });

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const s = join(from, entry);
    const d = join(to, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

copyDir(src, dest);
console.log(`Cesium assets copied → ${dest}`);

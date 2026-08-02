import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/ws": { target: "ws://localhost:3000", ws: true },
    },
  },
  // Cesium 体积大，避免构建时的解析警告
  build: {
    chunkSizeWarningLimit: 6000,
  },
  optimizeDeps: {
    include: ["cesium", "ol"],
  },
});

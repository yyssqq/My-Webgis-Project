/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Cesium 静态资源根路径（public/cesium/） */
    CESIUM_BASE_URL: string;
  }
}

export {};

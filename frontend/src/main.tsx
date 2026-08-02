import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// 不用 StrictMode：开发模式下 effect 双调用会让 Cesium/OpenLayers 重复初始化
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

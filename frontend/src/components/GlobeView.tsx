import { useEffect, useRef } from "react";
import { createCesiumViewer, type CesiumHandle } from "../maps/cesium";

interface GlobeViewProps {
  active: boolean;
  onReady: (h: CesiumHandle) => void;
}

export function GlobeView({ active, onReady }: GlobeViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CesiumHandle | null>(null);
  const initialized = useRef(false);

  // 只在 active 首次为 true 时创建 Viewer（避免在 display:none 里初始化）
  useEffect(() => {
    if (!active || !elRef.current || initialized.current) return;
    initialized.current = true;
    const h = createCesiumViewer(elRef.current);
    handleRef.current = h;
    onReady(h);
    return () => {
      h.viewer.destroy();
      handleRef.current = null;
      initialized.current = false;
    };
  }, [active, onReady]);

  useEffect(() => {
    if (active) handleRef.current?.resize();
  }, [active]);

  return (
    <div
      ref={elRef}
      style={{
        position: "absolute",
        inset: 0,
        visibility: active ? "visible" : "hidden",
      }}
    />
  );
}

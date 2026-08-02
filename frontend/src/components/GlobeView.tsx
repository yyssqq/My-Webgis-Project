import { useEffect, useRef } from "react";
import { createCesiumViewer, type CesiumHandle } from "../maps/cesium";

interface GlobeViewProps {
  active: boolean;
  onReady: (h: CesiumHandle) => void;
}

export function GlobeView({ active, onReady }: GlobeViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CesiumHandle | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const h = createCesiumViewer(elRef.current);
    handleRef.current = h;
    onReady(h);
    return () => {
      h.viewer.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) handleRef.current?.resize();
  }, [active]);

  return (
    <div ref={elRef} style={{ position: "absolute", inset: 0, display: active ? "block" : "none" }} />
  );
}

import { useEffect, useRef } from "react";
import { createOlMap, type OlHandle } from "../maps/openlayers";

interface MapViewProps {
  active: boolean;
  onReady: (h: OlHandle) => void;
}

export function MapView({ active, onReady }: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<OlHandle | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const h = createOlMap(elRef.current);
    handleRef.current = h;
    onReady(h);
    return () => {
      h.map.dispose();
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

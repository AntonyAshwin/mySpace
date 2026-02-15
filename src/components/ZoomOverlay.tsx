import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  active: boolean;
  origin: { x: number; y: number } | null;
  onEntered?: () => void;
  durationMs?: number;
};

export default function ZoomOverlay({ active, origin, onEntered, durationMs = 250 }: Props) {
  const [visible, setVisible] = useState(false);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  // Compute max scale needed to cover viewport from origin
  const targetScale = useMemo(() => {
    if (!origin) return 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxDist = Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(w - origin.x, origin.y),
      Math.hypot(origin.x, h - origin.y),
      Math.hypot(w - origin.x, h - origin.y)
    );
    // Start radius ~6px, scale until radius >= maxDist
    const baseRadius = 6;
    return Math.ceil(maxDist / baseRadius);
  }, [origin]);

  useEffect(() => {
    if (active && origin) {
      setVisible(true);
      setStyle({
        left: origin.x,
        top: origin.y,
        width: 12,
        height: 12,
        transform: 'translate(-50%, -50%) scale(0.01)',
      });
      // Trigger next frame for transition
      const id = requestAnimationFrame(() => {
        setStyle((prev) => ({
          ...prev,
          transform: `translate(-50%, -50%) scale(${targetScale})`,
          transition: `transform ${durationMs}ms ease-out`,
        }));
      });
      return () => cancelAnimationFrame(id);
    } else {
      // Hide overlay
      setVisible(false);
      setStyle({});
    }
  }, [active, origin, targetScale, durationMs]);

  useEffect(() => {
    if (!circleRef.current) return;
    const el = circleRef.current;
    const handler = () => {
      onEntered?.();
    };
    el.addEventListener('transitionend', handler);
    return () => el.removeEventListener('transitionend', handler);
  }, [onEntered]);

  if (!visible || !origin) return null;
  return (
    <div className="zoom-overlay" aria-hidden>
      <div ref={circleRef} className="zoom-circle" style={style} />
    </div>
  );
}

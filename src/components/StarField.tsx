import React, { useEffect, useRef, useState } from 'react';
import { mulberry32 } from '../lib/random';
import spec from '../agent-spec.json';

export type Star = {
  id: number;
  x: number;
  y: number;
  seed: number;
};

type Props = {
  onSelect: (star: Star, origin: { x: number; y: number }) => void;
};

const STAR_COUNT = (spec?.tunables?.starCount as number) ?? 500;
const STAR_RADIUS = (spec?.tunables?.starRadius as number) ?? 1.2;
const CLICK_THRESHOLD = (spec?.tunables?.clickThresholdPx as number) ?? 8; // px
const STARFIELD_SEED = (spec?.tunables?.starfieldSeed as number) ?? 123456789;
const HOVER_THRESHOLD = 14; // px distance to show highlight
const HOVER_RING_RADIUS = 10; // px ring around the star
const WORLD_SIZE = (spec?.tunables?.spaceWorldSize as number) ?? 6000; // virtual square space in px units
const INITIAL_ZOOM = (spec?.tunables?.initialZoom as number) ?? 1.0;
const MIN_ZOOM = (spec?.tunables?.minZoom as number) ?? 0.5;
const MAX_ZOOM = (spec?.tunables?.maxZoom as number) ?? 4.0;
const ZOOM_SPEED = (spec?.tunables?.zoomSpeed as number) ?? 0.12; // wheel zoom sensitivity

export default function StarField({ onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(INITIAL_ZOOM);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Center the view on the middle of the world
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const newOffset = {
        x: WORLD_SIZE / 2 - screenW / (2 * scale),
        y: WORLD_SIZE / 2 - screenH / (2 * scale),
      };
      setOffset(clampOffset(newOffset, scale, screenW, screenH));
      draw();
    };

    const createStars = () => {
      const list: Star[] = [];
      const rng = mulberry32(STARFIELD_SEED);
      for (let i = 0; i < STAR_COUNT; i++) {
        list.push({
          id: i,
          x: rng() * WORLD_SIZE,
          y: rng() * WORLD_SIZE,
          seed: Math.floor(rng() * 1e9),
        });
      }
      setStars(list);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      for (const s of stars) {
        const sx = (s.x - offset.x) * scale;
        const sy = (s.y - offset.y) * scale;
        if (sx < -20 || sy < -20 || sx > screenW + 20 || sy > screenH + 20) continue; // cull off-screen
        ctx.beginPath();
        ctx.arc(sx, sy, STAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hoveredId !== null) {
        const hs = stars[hoveredId];
        if (hs) {
          const hx = (hs.x - offset.x) * scale;
          const hy = (hs.y - offset.y) * scale;
          ctx.strokeStyle = '#00ff66';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hx, hy, HOVER_RING_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    createStars();
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Redraw when stars update
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      for (const s of stars) {
        const sx = (s.x - offset.x) * scale;
        const sy = (s.y - offset.y) * scale;
        if (sx < -20 || sy < -20 || sx > screenW + 20 || sy > screenH + 20) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, STAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hoveredId !== null) {
        const hs = stars[hoveredId];
        if (hs) {
          const hx = (hs.x - offset.x) * scale;
          const hy = (hs.y - offset.y) * scale;
          ctx.strokeStyle = '#00ff66';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hx, hy, HOVER_RING_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    draw();
  }, [stars, hoveredId, scale, offset]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let nearest: Star | null = null;
    let nearestDist = Infinity;
    for (const s of stars) {
      const sx = (s.x - offset.x) * scale;
      const sy = (s.y - offset.y) * scale;
      const dx = sx - x;
      const dy = sy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = s;
      }
    }
    // If a star is highlighted, select it even if slightly outside default threshold
    if (hoveredId !== null) {
      const hs = stars[hoveredId];
      if (hs) {
        const hx = (hs.x - offset.x) * scale;
        const hy = (hs.y - offset.y) * scale;
        onSelect(hs, { x: hx, y: hy });
        return;
      }
    }
    if (nearest && nearestDist <= CLICK_THRESHOLD) {
      onSelect(nearest, { x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (draggingRef.current.dragging) {
      const dx = e.clientX - draggingRef.current.lastX;
      const dy = e.clientY - draggingRef.current.lastY;
      draggingRef.current.lastX = e.clientX;
      draggingRef.current.lastY = e.clientY;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const newOffset = {
        x: offset.x - dx / scale,
        y: offset.y - dy / scale,
      };
      setOffset(clampOffset(newOffset, scale, screenW, screenH));
      return;
    }
    let nearestId: number | null = null;
    let nearestDist = Infinity;
    for (const s of stars) {
      const sx = (s.x - offset.x) * scale;
      const sy = (s.y - offset.y) * scale;
      const dx = sx - x;
      const dy = sy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = s.id;
      }
    }
    if (nearestId !== null && nearestDist <= HOVER_THRESHOLD) {
      if (hoveredId !== nearestId) setHoveredId(nearestId);
    } else if (hoveredId !== null) {
      setHoveredId(null);
    }
  };

  const handleMouseLeave = () => {
    if (hoveredId !== null) setHoveredId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const direction = e.deltaY < 0 ? 1 : -1;
    const targetScale = clamp(scale * (1 + direction * ZOOM_SPEED), MIN_ZOOM, MAX_ZOOM);
    // Keep the cursor world point fixed under the cursor when zooming
    const wx = x / scale + offset.x;
    const wy = y / scale + offset.y;
    const newOffset = {
      x: wx - x / targetScale,
      y: wy - y / targetScale,
    };
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    setScale(targetScale);
    setOffset(clampOffset(newOffset, targetScale, screenW, screenH));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draggingRef.current.dragging = true;
    draggingRef.current.lastX = e.clientX;
    draggingRef.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    draggingRef.current.dragging = false;
  };

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function clampOffset(off: { x: number; y: number }, sc: number, screenW: number, screenH: number) {
    const maxX = Math.max(0, WORLD_SIZE - screenW / sc);
    const maxY = Math.max(0, WORLD_SIZE - screenH / sc);
    return {
      x: clamp(off.x, 0, maxX),
      y: clamp(off.y, 0, maxY),
    };
  }

  const zoomByButtons = (direction: 1 | -1) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const targetScale = clamp(scale * (1 + direction * ZOOM_SPEED), MIN_ZOOM, MAX_ZOOM);
    const wx = screenW / (2 * scale) + offset.x;
    const wy = screenH / (2 * scale) + offset.y;
    const newOffset = {
      x: wx - screenW / (2 * targetScale),
      y: wy - screenH / (2 * targetScale),
    };
    setScale(targetScale);
    setOffset(clampOffset(newOffset, targetScale, screenW, screenH));
  };

  return (
    <div className="starfield-container">
      <canvas
        ref={canvasRef}
        className="starfield"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseUp}
        aria-label="Starfield"
      />
      <div className="zoom-controls" aria-label="Zoom controls">
        <button className="zoom-btn" onClick={() => zoomByButtons(1)} aria-label="Zoom in">＋</button>
        <button className="zoom-btn" onClick={() => zoomByButtons(-1)} aria-label="Zoom out">－</button>
      </div>
    </div>
  );
}

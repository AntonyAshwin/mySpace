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
const INITIAL_ZOOM = (spec?.tunables?.initialZoom as number) ?? 0.5;
const MIN_ZOOM = (spec?.tunables?.minZoom as number) ?? 0.5;
const MAX_ZOOM = (spec?.tunables?.maxZoom as number) ?? 4.0;
const ZOOM_SPEED = (spec?.tunables?.zoomSpeed as number) ?? 0.12; // wheel zoom sensitivity
const TILE_SIZE = (spec?.tunables?.tileSize as number) ?? 800; // world units per tile
const STARS_PER_TILE = (spec?.tunables?.starsPerTile as number) ?? 80;
const DRAG_CLICK_CANCEL_THRESHOLD = (spec?.tunables?.dragClickCancelThresholdPx as number) ?? 4; // px movement to treat as drag

export default function StarField({ onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [scale, setScale] = useState<number>(MIN_ZOOM);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = useRef<{ dragging: boolean; lastX: number; lastY: number; startX: number; startY: number; moved: boolean }>({ dragging: false, lastX: 0, lastY: 0, startX: 0, startY: 0, moved: false });

  // Procedural infinite stars: generate per tile deterministically
  const tileSeed = (tx: number, ty: number) => ((STARFIELD_SEED ^ (tx * 0x9e3779b1) ^ (ty * 0x85ebca77)) >>> 0);

  const generateTileStars = (tx: number, ty: number): Star[] => {
    const rng = mulberry32(tileSeed(tx, ty));
    const list: Star[] = [];
    for (let i = 0; i < STARS_PER_TILE; i++) {
      const x = tx * TILE_SIZE + rng() * TILE_SIZE;
      const y = ty * TILE_SIZE + rng() * TILE_SIZE;
      list.push({ id: ((tx << 16) ^ ty ^ i) >>> 0, x, y, seed: Math.floor(rng() * 1e9) });
    }
    return list;
  };

  const forVisibleTiles = (fn: (tx: number, ty: number) => void) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const vx0 = offset.x;
    const vy0 = offset.y;
    const vx1 = offset.x + screenW / scale;
    const vy1 = offset.y + screenH / scale;
    const tx0 = Math.floor(vx0 / TILE_SIZE) - 1;
    const ty0 = Math.floor(vy0 / TILE_SIZE) - 1;
    const tx1 = Math.floor(vx1 / TILE_SIZE) + 1;
    const ty1 = Math.floor(vy1 / TILE_SIZE) + 1;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) fn(tx, ty);
    }
  };

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
      // Initialize view; infinite world so start at origin
      setOffset({ x: 0, y: 0 });
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      forVisibleTiles((tx, ty) => {
        const tileStars = generateTileStars(tx, ty);
        for (const s of tileStars) {
          const sx = (s.x - offset.x) * scale;
          const sy = (s.y - offset.y) * scale;
          if (sx < -20 || sy < -20 || sx > screenW + 20 || sy > screenH + 20) return;
          ctx.beginPath();
          ctx.arc(sx, sy, STAR_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      // Hover ring is drawn in the secondary redraw effect using hoveredStar.
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      forVisibleTiles((tx, ty) => {
        const tileStars = generateTileStars(tx, ty);
        for (const s of tileStars) {
          const sx = (s.x - offset.x) * scale;
          const sy = (s.y - offset.y) * scale;
          if (sx < -20 || sy < -20 || sx > screenW + 20 || sy > screenH + 20) return;
          ctx.beginPath();
          ctx.arc(sx, sy, STAR_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (hoveredStar) {
        const hx = (hoveredStar.x - offset.x) * scale;
        const hy = (hoveredStar.y - offset.y) * scale;
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hx, hy, HOVER_RING_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    draw();
  }, [hoveredStar, scale, offset]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If this pointer moved enough, it's a pan, not a click
    if (draggingRef.current.moved) {
      draggingRef.current.moved = false; // reset for next interaction
      return;
    }
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let nearest: Star | null = null;
    let nearestDist = Infinity;
    const wx = x / scale + offset.x;
    const wy = y / scale + offset.y;
    const cx = Math.floor(wx / TILE_SIZE);
    const cy = Math.floor(wy / TILE_SIZE);
    for (let ty = cy - 1; ty <= cy + 1; ty++) {
      for (let tx = cx - 1; tx <= cx + 1; tx++) {
        const tileStars = generateTileStars(tx, ty);
        for (const s of tileStars) {
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
      }
    }
    // If a star is highlighted, select it even if slightly outside default threshold
    if (hoveredStar) {
      const hx = (hoveredStar.x - offset.x) * scale;
      const hy = (hoveredStar.y - offset.y) * scale;
      onSelect(hoveredStar, { x: hx, y: hy });
      return;
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
      const totalDx = e.clientX - draggingRef.current.startX;
      const totalDy = e.clientY - draggingRef.current.startY;
      if (Math.abs(totalDx) + Math.abs(totalDy) >= DRAG_CLICK_CANCEL_THRESHOLD) {
        draggingRef.current.moved = true;
      }
      const newOffset = {
        x: offset.x - dx / scale,
        y: offset.y - dy / scale,
      };
      setOffset(newOffset);
      return;
    }
    let nearest: Star | null = null;
    let nearestDist = Infinity;
    const wx = x / scale + offset.x;
    const wy = y / scale + offset.y;
    const cx = Math.floor(wx / TILE_SIZE);
    const cy = Math.floor(wy / TILE_SIZE);
    for (let ty = cy - 1; ty <= cy + 1; ty++) {
      for (let tx = cx - 1; tx <= cx + 1; tx++) {
        const tileStars = generateTileStars(tx, ty);
        for (const s of tileStars) {
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
      }
    }
    if (nearest && nearestDist <= HOVER_THRESHOLD) {
      setHoveredStar(nearest);
    } else {
      if (hoveredStar) setHoveredStar(null);
    }
  };

  const handleMouseLeave = () => {
    if (hoveredStar) setHoveredStar(null);
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
    setScale(targetScale);
    setOffset(newOffset);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draggingRef.current.dragging = true;
    draggingRef.current.lastX = e.clientX;
    draggingRef.current.lastY = e.clientY;
    draggingRef.current.startX = e.clientX;
    draggingRef.current.startY = e.clientY;
    draggingRef.current.moved = false;
  };

  const handleMouseUp = () => {
    draggingRef.current.dragging = false;
  };

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  // No offset clamping: allow infinite pan and procedural generation

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
    setOffset(newOffset);
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

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

export default function StarField({ onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
      draw();
    };

    const createStars = () => {
      const list: Star[] = [];
      const rng = mulberry32(STARFIELD_SEED);
      for (let i = 0; i < STAR_COUNT; i++) {
        list.push({
          id: i,
          x: rng() * window.innerWidth,
          y: rng() * window.innerHeight,
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
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, STAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hoveredId !== null) {
        const hs = stars[hoveredId];
        if (hs) {
          ctx.strokeStyle = '#00ff66';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, HOVER_RING_RADIUS, 0, Math.PI * 2);
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
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, STAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hoveredId !== null) {
        const hs = stars[hoveredId];
        if (hs) {
          ctx.strokeStyle = '#00ff66';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, HOVER_RING_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    draw();
  }, [stars, hoveredId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let nearest: Star | null = null;
    let nearestDist = Infinity;
    for (const s of stars) {
      const dx = s.x - x;
      const dy = s.y - y;
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
        onSelect(hs, { x: hs.x, y: hs.y });
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
    let nearestId: number | null = null;
    let nearestDist = Infinity;
    for (const s of stars) {
      const dx = s.x - x;
      const dy = s.y - y;
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

  return (
    <canvas
      ref={canvasRef}
      className="starfield"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Starfield"
    />
  );
}

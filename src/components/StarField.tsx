import React, { useEffect, useRef, useState } from 'react';

export type Star = {
  id: number;
  x: number;
  y: number;
  seed: number;
};

type Props = {
  onSelect: (star: Star, origin: { x: number; y: number }) => void;
};

const STAR_COUNT = 500;
const STAR_RADIUS = 1.2;
const CLICK_THRESHOLD = 8; // px

export default function StarField({ onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stars, setStars] = useState<Star[]>([]);

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
      for (let i = 0; i < STAR_COUNT; i++) {
        list.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          seed: Math.floor(Math.random() * 1e9),
        });
      }
      setStars(list);
    };

    const draw = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, STAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
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
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, STAR_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [stars]);

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
    if (nearest && nearestDist <= CLICK_THRESHOLD) {
      onSelect(nearest, { x, y });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="starfield"
      onClick={handleClick}
      aria-label="Starfield"
    />
  );
}

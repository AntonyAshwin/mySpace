import React, { useEffect, useRef } from 'react';
import { generatePlanet, renderPlanet } from '../lib/procedural';
import { mulberry32, randRange } from '../lib/random';

type Props = {
  seed: number;
  size?: number; // canvas size in CSS px
};

export default function PlanetCanvas({ seed, size = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Prepare offscreen planet
    const off = document.createElement('canvas');
    off.width = Math.floor(size * dpr);
    off.height = Math.floor(size * dpr);
    offscreenRef.current = off;
    const octx = off.getContext('2d')!;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Transparent background; draw planet centered
    const params = generatePlanet(seed);
    const r = size * 0.45;
    renderPlanet(octx, seed, params, size / 2, size / 2, r);

    // Rotation parameters determined by seed
    const rng = mulberry32(seed);
    const dir = rng() < 0.95 ? 1 : -1; // 95% clockwise (left-to-right), 5% counter-clockwise
    const speed = randRange(rng, 0.006, 0.016);
    angleRef.current = 0;
    const animate = () => {
      const angle = angleRef.current;
      angleRef.current = (angle + dir * speed) % (Math.PI * 2);

      // Clear
      ctx.clearRect(0, 0, size, size);
      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.clip();
      // Rotate and draw offscreen
      ctx.translate(size / 2, size / 2);
      ctx.rotate(angleRef.current);
      ctx.drawImage(off, -size / 2, -size / 2, size, size);
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [seed, size]);

  return <canvas ref={canvasRef} className="planet-canvas" aria-label="Rotating planet" />;
}

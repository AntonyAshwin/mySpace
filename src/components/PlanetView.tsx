import React, { useEffect, useRef } from 'react';
import { generatePlanet, renderPlanet } from '../lib/procedural';

type Props = {
  seed: number;
  onExit: () => void;
};

export default function PlanetView({ seed, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const params = generatePlanet(seed);
    const draw = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const r = Math.min(w, h) * 0.32;
      renderPlanet(ctx, seed, params, w / 2, h / 2, r);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [seed]);

  return (
    <div className="planet-view" onClick={onExit} aria-label="Planet view">
      <canvas ref={canvasRef} className="planet-canvas" />
      <div className="hint">Tap anywhere to go back</div>
    </div>
  );
}

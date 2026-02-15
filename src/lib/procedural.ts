import { choice, hslToRgb, mulberry32, randRange, rgbStr } from './random';

export type PlanetType = 'gaseous' | 'rocky';

export type PlanetParams = {
  hue: number;
  saturation: number;
  lightness: number;
  banding: number; // 0..1
  noise: number;   // 0..1
  clouds: number;  // 0..1
  ocean: number;   // 0..1
  hasRings: boolean;
  ringTilt: number; // degrees
  type: PlanetType;
};

export function generatePlanet(seed: number): PlanetParams {
  const rng = mulberry32(seed);
  const type: PlanetType = rng() < 0.8 ? 'gaseous' : 'rocky';
  const hue = randRange(rng, 0, 360);
  const saturation = randRange(rng, 0.4, 0.9);
  const lightness = randRange(rng, 0.35, 0.65);
  const banding = randRange(rng, 0.0, 1.0);
  const noise = randRange(rng, 0.2, 0.8);
  const clouds = randRange(rng, 0.0, 0.7);
  const ocean = type === 'rocky' ? randRange(rng, 0.2, 0.8) : randRange(rng, 0.0, 0.3);
  const hasRings = rng() < 0.35;
  const ringTilt = randRange(rng, -35, 35);
  return { hue, saturation, lightness, banding, noise, clouds, ocean, hasRings, ringTilt, type };
}

// Simple 2D value noise using a hashed grid
function hash2(x: number, y: number, seed: number): number {
  let t = Math.sin(x * 127.1 + y * 311.7 + seed * 0.0001) * 43758.5453123;
  return t - Math.floor(t);
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function noise2(x: number, y: number, seed: number, scale = 0.008): number {
  const gx = Math.floor(x * scale);
  const gy = Math.floor(y * scale);
  const lx = x * scale - gx;
  const ly = y * scale - gy;
  const h00 = hash2(gx, gy, seed);
  const h10 = hash2(gx + 1, gy, seed);
  const h01 = hash2(gx, gy + 1, seed);
  const h11 = hash2(gx + 1, gy + 1, seed);
  const tx = smoothstep(lx);
  const ty = smoothstep(ly);
  const a = h00 * (1 - tx) + h10 * tx;
  const b = h01 * (1 - tx) + h11 * tx;
  return a * (1 - ty) + b * ty; // 0..1
}

// Fractal Brownian Motion combining multiple octaves of noise
function fbm(x: number, y: number, seed: number, baseScale = 0.008, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let scale = baseScale;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2(x, y, seed + i * 1337, scale);
    amp *= 0.5;
    scale *= 2;
  }
  return Math.min(1, Math.max(0, value));
}

// Periodic along X to eliminate seams on sphere wrapping
function noise2PeriodicX(x: number, y: number, seed: number, scale: number, periodSize: number): number {
  const gxFloat = x * scale;
  const gyFloat = y * scale;
  const gx = Math.floor(gxFloat);
  const gy = Math.floor(gyFloat);
  const lx = gxFloat - gx;
  const ly = gyFloat - gy;
  const periodCells = Math.max(1, Math.floor(periodSize * scale));
  const wrap = (n: number) => ((n % periodCells) + periodCells) % periodCells;
  const h00 = hash2(wrap(gx), gy, seed);
  const h10 = hash2(wrap(gx + 1), gy, seed);
  const h01 = hash2(wrap(gx), gy + 1, seed);
  const h11 = hash2(wrap(gx + 1), gy + 1, seed);
  const tx = smoothstep(lx);
  const ty = smoothstep(ly);
  const a = h00 * (1 - tx) + h10 * tx;
  const b = h01 * (1 - tx) + h11 * tx;
  return a * (1 - ty) + b * ty; // 0..1
}

function fbmPeriodicX(x: number, y: number, seed: number, baseScale: number, octaves: number, periodSize: number): number {
  let value = 0;
  let amp = 0.5;
  let scale = baseScale;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2PeriodicX(x, y, seed + i * 1337, scale, periodSize);
    amp *= 0.5;
    scale *= 2;
  }
  return Math.min(1, Math.max(0, value));
}

export function renderPlanet(
  ctx: CanvasRenderingContext2D,
  seed: number,
  params: PlanetParams,
  cx: number,
  cy: number,
  r: number
) {
  // Base gradient for lighting
  const baseRGB = hslToRgb(params.hue, params.saturation, params.lightness);
  const lighter = hslToRgb(params.hue, params.saturation, Math.min(1, params.lightness + 0.1));
  const darker = hslToRgb(params.hue, params.saturation, Math.max(0, params.lightness - 0.15));

  const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, rgbStr(lighter[0], lighter[1], lighter[2]));
  grad.addColorStop(1, rgbStr(darker[0], darker[1], darker[2]));

  ctx.save();
  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (params.type === 'rocky') {
    // Geography: land/ocean with multi-octave noise, plus latitudinal variation
    const step = 2; // draw in 2px increments for performance
    const oceanThreshold = 0.5 - params.ocean * 0.25; // more ocean -> higher chance of water
    const landHue = (params.hue + 20) % 360;
    const oceanHue = (params.hue + 200) % 360;
    for (let y = cy - r; y < cy + r; y += step) {
      for (let x = cx - r; x < cx + r; x += step) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r * r) continue; // inside circle only
        const lat = 1 - Math.abs(dy) / r; // 0 at poles, 1 at equator
        const t = fbm(x, y, seed, 0.006 + params.noise * 0.006, 5); // terrain
        const isOcean = t < oceanThreshold;
        let h = isOcean ? oceanHue : landHue;
        let s = isOcean ? params.saturation * 0.7 : params.saturation * 0.9;
        let l = isOcean ? params.lightness * 0.6 : params.lightness * 0.55;
        // More shades via secondary noise and latitude
        const shade = fbm(x + 1000, y - 500, seed + 999, 0.012, 3);
        l = l + (shade - 0.5) * 0.18 + (lat - 0.5) * 0.12;
        // Slight hue drift for land to simulate biomes
        if (!isOcean) h = h + (shade - 0.5) * 30;
        const [rr, gg, bb] = hslToRgb(h, s, Math.max(0, Math.min(1, l)));
        ctx.fillStyle = rgbStr(rr, gg, bb);
        ctx.fillRect(x, y, step, step);
      }
    }

    // Polar caps (ice)
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.85, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.85, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Gaseous: bands and swirls
    for (let y = cy - r; y < cy + r; y += 1) {
      const lat = (y - (cy - r)) / (2 * r);
      const band = Math.sin((lat * Math.PI * 2) * (3 + params.banding * 8)) * 0.5 + 0.5;
      const swirl = fbm(y * 1.7, cx * 0.6, seed + 555, 0.01, 4);
      const mix = Math.min(1, 0.5 * (params.noise * swirl + params.banding * band));
      const rr = baseRGB[0] + mix * 25 - 8;
      const gg = baseRGB[1] + mix * 15 - 6;
      const bb = baseRGB[2] + mix * 12 - 6;
      ctx.strokeStyle = rgbStr(rr, gg, bb);
      ctx.beginPath();
      ctx.moveTo(cx - r, y);
      ctx.lineTo(cx + r, y);
      ctx.stroke();
    }
  }

  // Polar caps (ice)
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.85, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.85, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (params.clouds > 0.15) {
    ctx.globalAlpha = Math.min(0.5, params.clouds * 0.6);
    // Soft clouds using wide arcs and noise jitter
    for (let i = 0; i < 180; i++) {
      const ang = (i / 180) * Math.PI * 2;
      const rr2 = r * (0.5 + 0.4 * fbm(Math.cos(ang) * 120, Math.sin(ang) * 120, seed + 4321, 0.01, 3));
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rr2, ang, ang + 0.02);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Optional: subtle atmosphere glow
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = rgbStr(lighter[0], lighter[1], lighter[2]);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Rings
  if (params.hasRings) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((params.ringTilt * Math.PI) / 180);
    for (let i = 0; i < 12; i++) {
      const ir = r * (1.2 + i * 0.04);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(200,200,200,0.5)' : 'rgba(160,160,160,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, ir, ir * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

// Create color and bump textures for 3D rendering
export function renderPlanetTextures(seed: number, params: PlanetParams, size: number) {
  const dpr = window.devicePixelRatio || 1;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = Math.floor(size * dpr);
  colorCanvas.height = Math.floor(size * dpr);
  const colorCtx = colorCanvas.getContext('2d')!;
  colorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = Math.floor(size * dpr);
  bumpCanvas.height = Math.floor(size * dpr);
  const bumpCtx = bumpCanvas.getContext('2d')!;
  bumpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Build color and bump textures across entire equirectangular area
  const step = 2; // performance step
  const oceanThreshold = 0.5 - params.ocean * 0.25;
  for (let y = 0; y < size; y += step) {
    // Latitude [-1,1] where 0 is equator
    const latNorm = y / size;
    const lat = (latNorm - 0.5) * 2;
    const latShade = lat; // used to modulate lightness
    for (let x = 0; x < size; x += step) {
      const lonNorm = x / size; // 0..1
      if (params.type === 'rocky') {
        const t = fbmPeriodicX(x, y, seed, 0.006 + params.noise * 0.006, 5, size);
        const isOcean = t < oceanThreshold;
        let h = isOcean ? (params.hue + 200) % 360 : (params.hue + 20) % 360;
        let s = isOcean ? params.saturation * 0.7 : params.saturation * 0.9;
        let l = isOcean ? params.lightness * 0.6 : params.lightness * 0.55;
        const shade = fbmPeriodicX(x + 1000, y - 500, seed + 999, 0.012, 3, size);
        l = l + (shade - 0.5) * 0.18 + (latShade) * 0.12;
        if (!isOcean) h = h + (shade - 0.5) * 30;
        const [rr, gg, bb] = hslToRgb(h, s, Math.max(0, Math.min(1, l)));
        colorCtx.fillStyle = rgbStr(rr, gg, bb);
        colorCtx.fillRect(x, y, step, step);
        // bump
        const bumpVal = isOcean ? 0.4 + t * 0.2 : 0.6 + t * 0.4;
        const grey = Math.round(bumpVal * 255);
        bumpCtx.fillStyle = rgbStr(grey, grey, grey);
        bumpCtx.fillRect(x, y, step, step);
      } else {
        const band = Math.sin(((latNorm) * Math.PI * 2) * (3 + params.banding * 8)) * 0.5 + 0.5;
        const swirl = fbmPeriodicX(y * 1.4, x * 0.6, seed + 555, 0.01, 4, size);
        const mix = Math.min(1, 0.5 * (params.noise * swirl + params.banding * band));
        const baseRGB = hslToRgb(params.hue, params.saturation, params.lightness);
        const rr = baseRGB[0] + mix * 25 - 8;
        const gg = baseRGB[1] + mix * 15 - 6;
        const bb = baseRGB[2] + mix * 12 - 6;
        colorCtx.fillStyle = rgbStr(rr, gg, bb);
        colorCtx.fillRect(x, y, step, step);
        // bump for gaseous
        const val = Math.min(1, 0.5 * (params.noise * swirl + params.banding * band));
        const grey = Math.round((0.5 + val * 0.5) * 255);
        bumpCtx.fillStyle = rgbStr(grey, grey, grey);
        bumpCtx.fillRect(x, y, step, step);
      }
    }
  }

  // Textures are periodic along X; no seam stitching required

  return { colorCanvas, bumpCanvas };
}

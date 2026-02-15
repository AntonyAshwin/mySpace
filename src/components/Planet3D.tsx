import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generatePlanet, renderPlanetTextures } from '../lib/procedural';
import { mulberry32, randRange } from '../lib/random';

type Props = {
  seed: number;
  size?: number; // canvas size in CSS px for renderer
  params?: import('../lib/procedural').PlanetParams;
};

export default function Planet3D({ seed, size = 560, params: injectedParams }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = size;
    const height = size;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(-3, 2, 5);
    scene.add(dir);

    // Planet textures
    const params = injectedParams ?? generatePlanet(seed);
    const texSize = Math.floor(Math.min(width, height) * 2); // bigger texture to avoid artifacts
    const { colorCanvas, bumpCanvas } = renderPlanetTextures(seed, params, texSize);
    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    colorTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapS = THREE.RepeatWrapping;
    colorTex.needsUpdate = true;
    bumpTex.needsUpdate = true;

    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    // Ensure correct color space for better appearance
    colorTex.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: params.type === 'rocky' ? 0.06 : 0.015,
      roughness: params.type === 'rocky' ? 0.8 : 0.5,
      metalness: 0.0,
    });
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);

    // Atmosphere glow (additive)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.83, 64, 64), glowMat);
    scene.add(glow);

    // Rotation parameters
    const rng = mulberry32(seed);
    const dirSign = rng() < 0.95 ? 1 : -1; // 95% anticlockwise, 5% clockwise
    const speed = randRange(rng, 0.006, 0.016);

    const animate = () => {
      planet.rotation.y += dirSign * speed;
      glow.rotation.y += dirSign * speed;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    const cleanup = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      colorTex.dispose();
      bumpTex.dispose();
      mount.removeChild(renderer.domElement);
    };
    return cleanup;
  }, [seed, size]);

  return (
    <div className="planet-3d" style={{ width: size, height: size }}>
      <div ref={mountRef} />
      <div className="hint">Tap backdrop to close</div>
    </div>
  );
}

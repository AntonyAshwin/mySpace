# Space Planets (Web)

A modular React + TypeScript webapp that renders a black space background with tiny stars. Tapping a star zooms into a full-screen circle and reveals a procedurally generated planet. Tapping the black background returns to the original starfield.

## Features
- Starfield on black space with very small stars
- Tap a star to zoom into a circular overlay
- Procedural planet colors, banding, noise, clouds, oceans, rings
- Tap anywhere to exit and zoom back out
- Modularized components and lib utilities for maintainability

## Quick Start
```bash
# From the repo root
cd /Users/I528714/Desktop/MyIOSApp/mySpace
npm install
npm run dev
```
Open http://localhost:5173/ in your browser.

## Project Structure
- [index.html](index.html): App entry HTML
- [vite.config.ts](vite.config.ts): Vite config with React plugin
- [src/main.tsx](src/main.tsx): React bootstrap
- [src/App.tsx](src/App.tsx): App shell and orchestration
- [src/styles.css](src/styles.css): Global styles
- [src/components/StarField.tsx](src/components/StarField.tsx): Canvas starfield and click detection
- [src/components/ZoomOverlay.tsx](src/components/ZoomOverlay.tsx): Zoom circle overlay animation
- [src/components/PlanetView.tsx](src/components/PlanetView.tsx): Full-screen planet view and exit
- [src/lib/random.ts](src/lib/random.ts): Seeded RNG and color utilities
- [src/lib/procedural.ts](src/lib/procedural.ts): Planet parameter generation and canvas rendering

## Controls
- Click on a small star: zooms in and shows a planet
- Click on the black background (planet view): zooms out back to starfield

## Build
## Features
- Starfield on black space with very small stars
- Tap a star to open a modal with blurred backdrop
- 3D globe planets (Three.js) with procedural textures
	- 80% gaseous (banded swirls), 20% rocky (land/ocean, polar caps)
	- Deterministic per star seed
	- Rotation: 95% anticlockwise, 5% clockwise; speed varies per seed
- Tap backdrop to close and unblur space
- Modularized components and lib utilities for maintainability

## Notes
- Animation handled via CSS transform scaling in [ZoomOverlay](src/components/ZoomOverlay.tsx).

## Controls
- Click a small star: opens 3D planet modal with blurred backdrop
- Click the blurred backdrop: closes modal and returns to starfield
- Procedural logic isolated under `src/lib` for reusability/testing.

# Agentic Update Guide

This document defines the behavior, architecture, and safe-change rules for future automated or agent-driven updates to the Space Planets webapp.

## Required Behaviors
- Black background with tiny, sparse white stars rendered on a full-screen canvas.
- Tapping near a star zooms from that origin into a full-screen circle overlay.
- After zoom, a procedurally generated planet is shown (color/looks are seeded).
- Tapping the black background (planet view) zooms back to the original starfield.

## Architecture Overview
- [src/App.tsx](../src/App.tsx): Orchestrates selection and modal lifecycle.
- [src/components/StarField.tsx](../src/components/StarField.tsx): Renders stars and detects click near a star.
- [src/components/Modal.tsx](../src/components/Modal.tsx): Backdrop blur and centered popup content.
- [src/components/PlanetCanvas.tsx](../src/components/PlanetCanvas.tsx): Rotating planet in a clipped circle.
- [src/lib/procedural.ts](../src/lib/procedural.ts): `generatePlanet(seed)` and `renderPlanet(...)` implementations.
- [src/lib/random.ts](../src/lib/random.ts): Seeded RNG and color helpers.
- [src/styles.css](../src/styles.css): Global styles and overlay visuals.

## Public API Contracts
- `StarField` props: `onSelect(star, origin)` where `star = { id, x, y, seed }`, `origin = { x, y }` in CSS pixels.
- `Modal` props: `onClose: () => void`, `children: ReactNode`.
- `PlanetCanvas` props: `seed: number`, `size?: number`.
- `procedural.ts`: `generatePlanet(seed): PlanetParams`, `renderPlanet(ctx, seed, params, cx, cy, r): void`.

These contracts must remain stable unless the guide and config are updated together.

## Tunables & Defaults
See [src/agent-spec.json](../src/agent-spec.json) for a machine-readable map of tunables and module paths. Current key defaults:
- `starCount = 500`, `starRadius = 1.2`, `clickThresholdPx = 8`.
- Rotation: `rightToLeftProbability = 0.05`, `speedRangeRadPerFrame = [0.006, 0.016]`.
- Planet generation ranges for banding/noise/clouds/ocean; ring chance and tilt.
- Terrain fBm octaves and thresholds.

## Update Rules (Safe Changes)
- Preserve required behaviors and public API contracts.
- Keep TypeScript types intact; do not remove `Star`, `PlanetParams` fields without updating the spec.
- Animation: keep zoom overlay expansion smooth and covering the viewport; duration may change via tunable.
- Rendering performance: avoid heavy dependencies; keep canvas ops incremental and bounded.
- Any change to constants: reflect in [src/agent-spec.json](../src/agent-spec.json).
- Document user-visible changes in [README.md](../README.md).

## Verification Checklist (Manual)
- Click very near a star: zoom triggers; circle expands from correct origin.
- No layout flash; zoom overlay covers entire screen before planet displays.
- Planet appearance is stable for a given seed (deterministic).
- Clicking anywhere on the planet view returns to starfield.
- Resize window maintains full-screen canvases and star spread.

## Extension Ideas
- Settings panel for tunables (star density, zoom speed, ring chance).
- Shareable URLs encoding the selected planet seed.
- Accessibility: keyboard activation and focus ring for nearest star.
- Mobile performance tweaks (reduce `starCount` on small screens).

## File Ownership & Boundaries
- UI component boundaries: `StarField`, `ZoomOverlay`, `PlanetView` should not import each other directly; `App` coordinates them.
- Procedural generation (`procedural.ts`) must stay UI-agnostic and only depend on canvas context.
- Colors and RNG helpers (`random.ts`) should not perform DOM operations.

## Change Management
- Update [src/agent-spec.json](../src/agent-spec.json) when adding/removing modules or tunables.
- Keep commits small and focused; include a brief rationale and updated checklist in the commit message.
- If public APIs change, bump `version` in the spec and reflect breaking changes here.
import React, { useMemo } from 'react';
import { PlanetParams, generatePlanetFacts } from '../lib/procedural';

type Props = {
  seed: number;
  params: PlanetParams;
};

export default function PlanetInfo({ seed, params }: Props) {
  const facts = useMemo(() => generatePlanetFacts(seed, params), [seed, params]);
  return (
    <div className="planet-info" aria-label="Planet scientific details">
      <div className="planet-name">{facts.name}</div>
      <div className="planet-meta">
        <span><strong>Type:</strong> {facts.type}</span>
        <span><strong>Radius:</strong> {facts.radiusKm.toLocaleString()} km</span>
        <span><strong>Avg Temp:</strong> {facts.avgTempK} K</span>
      </div>
      <div className="planet-elements">
        <strong>Main Elements:</strong> {facts.elements.join(', ')}
      </div>
    </div>
  );
}

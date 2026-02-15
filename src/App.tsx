import React, { useCallback, useMemo, useState } from 'react';
import StarField, { Star } from './components/StarField';
import Modal from './components/Modal';
import Planet3D from './components/Planet3D';
import PlanetInfo from './components/PlanetInfo';
import { generatePlanet } from './lib/procedural';

type Point = { x: number; y: number };

export default function App() {
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectStar = useCallback((star: Star, _origin: Point) => {
    setSelectedStar(star);
    setModalOpen(true);
  }, []);

  const seed = useMemo(() => selectedStar?.seed ?? Math.random() * 1e9, [selectedStar]);
  const params = useMemo(() => generatePlanet(seed), [seed]);

  const onRequestExit = useCallback(() => {
    setModalOpen(false);
    setSelectedStar(null);
  }, []);

  return (
    <div className="app-root">
      <div className={modalOpen ? 'space-layer blurred' : 'space-layer'}>
        <StarField onSelect={handleSelectStar} />
      </div>
      {modalOpen && (
        <Modal onClose={onRequestExit}>
          <Planet3D seed={seed} params={params} size={Math.min(window.innerWidth, window.innerHeight) * 0.72} />
          <PlanetInfo seed={seed} params={params} />
        </Modal>
      )}
    </div>
  );
}

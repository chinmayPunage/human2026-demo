import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense } from 'react';

import { HumanBody }      from './components/HumanBody';
import { ChakraNodes }    from './components/ChakraNodes';
import { ShoulderStress } from './components/ShoulderStress';
import { PEMFRings }      from './components/PEMFRings';
import { LighthouseBeam } from './components/LighthouseBeam';
import { TelemetryHUD }   from './components/TelemetryHUD';
import { useDataStream }  from './hooks/useDataStream';

function Scene() {
  return (
    <>
      {/* ── Ambient / directional lighting ─────────────────────────── */}
      <ambientLight intensity={0.10} color="#020818" />
      <directionalLight position={[4, 8, 4]}  intensity={0.30} color="#6677ff" />
      <directionalLight position={[-4, 2, -4]} intensity={0.15} color="#003388" />

      {/* ── Stars particle field ────────────────────────────────────── */}
      <Stars radius={60} depth={50} count={5000} factor={3} saturation={0.5} fade speed={0.35} />

      {/* ── Ground grid ─────────────────────────────────────────────── */}
      <Grid
        position={[0, -2.0, 0]}
        args={[14, 14]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#071428"
        sectionSize={2}
        sectionThickness={0.7}
        sectionColor="#0a2045"
        fadeDistance={14}
        fadeStrength={2}
        infiniteGrid={false}
      />

      {/* ── Human figure ─────────────────────────────────────────────── */}
      {/* If model appears lying flat: change rotation to [-Math.PI / 2, 0, 0] */}
      <group position={[0, -0.2, 0]} rotation={[0, 0, 0]}>
        <HumanBody />
        <ChakraNodes />
        <ShoulderStress />
        <PEMFRings />
        <LighthouseBeam />
      </group>

      {/* ── Camera controls ─────────────────────────────────────────── */}
      <OrbitControls
        autoRotate={false}
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={15}
        minPolarAngle={Math.PI * 0.5}
        maxPolarAngle={Math.PI * 0.5}
        target={[0, 0.0, 0]}
      />

      {/* ── Bloom post-processing — creates the holographic glow ───── */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.08}
          luminanceSmoothing={0.92}
          intensity={1.8}
          radius={0.85}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

function DataConnector() {
  useDataStream();
  return null;
}

export default function App() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#02040a' }}>

      <DataConnector />

      <Canvas
        camera={{ position: [0, 0.4, 7.5], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias:           true,
          alpha:               false,
          powerPreference:     'high-performance',
          toneMapping:         3,   // THREE.ACESFilmicToneMapping
          toneMappingExposure: 1.2,
        }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <TelemetryHUD />

    </div>
  );
}

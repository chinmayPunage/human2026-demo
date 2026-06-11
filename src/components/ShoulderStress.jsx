import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBioStore } from '../store/bioStore';

/**
 * STATE B (STRESS): Flickering red/orange aura overlaid on neck and
 * shoulder zone of the new organic mesh. Positions updated to match
 * LatheGeometry torso (shoulders at y ≈ 1.30, neck at y ≈ 1.54).
 */
export function ShoulderStress() {
  const animState  = useBioStore(s => s.animState);
  const emgNeckEnv = useBioStore(s => s.emgNeckEnv);

  const leftRef  = useRef();
  const rightRef = useRef();
  const neckRef  = useRef();
  const lightRef = useRef();
  const _opacity = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const isStress = animState === 'STRESS';
    _opacity.current += ((isStress ? 0.85 : 0) - _opacity.current) * 0.07;

    const op = _opacity.current;
    const visible = op > 0.01;

    const envNorm = Math.min(emgNeckEnv / 1.8, 1.0);
    const flicker = isStress
      ? op * (0.4 + Math.random() * 0.8 * envNorm)
      : op;

    const hue = (isStress && Math.random() > 0.35) ? '#ff2200' : '#ff7700';

    [leftRef, rightRef, neckRef].forEach(r => {
      if (!r.current) return;
      r.current.visible = visible;
      r.current.material.opacity = flicker;
      r.current.material.color.set(hue);
      r.current.material.emissiveIntensity = 0.9 + Math.random() * 0.7;
    });

    if (lightRef.current) {
      lightRef.current.visible   = visible;
      lightRef.current.intensity = flicker * 5.0;
    }
  });

  return (
    <group>
      {/* Left shoulder aura — shoulder cap at (-0.48, 1.30) */}
      <mesh ref={leftRef} position={[-0.48, 1.30, 0.03]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial
          color="#ff2200" emissive="#ff2200" emissiveIntensity={1.2}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Right shoulder aura */}
      <mesh ref={rightRef} position={[0.48, 1.30, 0.03]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial
          color="#ff2200" emissive="#ff2200" emissiveIntensity={1.2}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Neck/trap aura — neck at (0, 1.54), torso top at (0, 0.96) */}
      <mesh ref={neckRef} position={[0, 1.30, 0.04]}>
        <capsuleGeometry args={[0.28, 0.45, 10, 18]} />
        <meshStandardMaterial
          color="#ff5500" emissive="#ff3300" emissiveIntensity={1.0}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Red point light in shoulder zone */}
      <pointLight
        ref={lightRef}
        color="#ff2200"
        intensity={0}
        distance={2.8}
        decay={2}
        position={[0, 1.28, 0.35]}
      />
    </group>
  );
}

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBioStore } from '../store/bioStore';

/**
 * STATE C (PEMF): Expanding concentric purple rings from the PEMF coil zone.
 * Positioned at the lumbar/sacral spine region of the new organic mesh (y ≈ -0.45).
 */

const RING_DEFS = [
  { color: '#cc00ff', phase: 0.00, innerR: 0.22, outerR: 0.34, yOff:  0.00 },
  { color: '#9900ff', phase: 0.85, innerR: 0.30, outerR: 0.44, yOff:  0.02 },
  { color: '#6600cc', phase: 1.70, innerR: 0.46, outerR: 0.60, yOff:  0.04 },
  { color: '#4400aa', phase: 1.28, innerR: 0.18, outerR: 0.28, yOff: -0.02 },
];

export function PEMFRings() {
  const animState = useBioStore(s => s.animState);
  const groupRef  = useRef();
  const ringRefs  = useRef([null, null, null, null]);
  const lightRef  = useRef();
  const _mop      = useRef(0);

  useFrame(({ clock }) => {
    const t        = clock.elapsedTime;
    const isActive = animState === 'PEMF' || animState === 'LIGHTHOUSE';
    _mop.current  += ((isActive ? 1 : 0) - _mop.current) * 0.05;

    const mop = _mop.current;
    if (groupRef.current) groupRef.current.visible = mop > 0.01;

    ringRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const def   = RING_DEFS[i];
      const phase = ((t + def.phase) % 2.2) / 2.2;
      const scale = 0.25 + phase * 3.8;
      mesh.scale.set(scale, scale, 1);
      mesh.material.opacity = mop * (1 - phase) * (1 - phase) * 0.90;
    });

    if (lightRef.current) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 4.2);
      lightRef.current.intensity = mop * 4.0 * pulse;
      lightRef.current.visible   = mop > 0.01;
    }
  });

  // Lumbar/sacral area of new mesh: torso waist y ≈ -0.26, sacral y ≈ -0.55
  // Position group at y = -0.40 (PEMF coil zone)
  return (
    <group ref={groupRef} position={[0, -0.40, 0]}>
      {RING_DEFS.map((def, i) => (
        <mesh
          key={i}
          ref={el => { ringRefs.current[i] = el; }}
          position={[0, def.yOff, 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[def.innerR, def.outerR, 64]} />
          <meshBasicMaterial
            color={def.color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Static coil indicator */}
      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.17, 48]} />
        <meshBasicMaterial color="#cc88ff" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      <pointLight
        ref={lightRef}
        color="#9900ff"
        intensity={0}
        distance={4.0}
        decay={2}
        position={[0, 0, 0.35]}
      />
    </group>
  );
}

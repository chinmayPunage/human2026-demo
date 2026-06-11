import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBioStore } from '../store/bioStore';

/**
 * LIGHTHOUSE STATE: Vertical gold/white beacon beam rising from heart node
 * (y ≈ 0.72) and crown (y ≈ 1.92). Positions recalibrated to new organic mesh.
 */
export function LighthouseBeam() {
  const animState = useBioStore(s => s.animState);

  const innerRef  = useRef();
  const outerRef  = useRef();
  const glowRef   = useRef();
  const lightHRef = useRef(); // heart light
  const lightCRef = useRef(); // crown/third-eye light
  const _opacity  = useRef(0);
  const _scaleY   = useRef(0);

  useFrame(({ clock }) => {
    const t        = clock.elapsedTime;
    const isLight  = animState === 'LIGHTHOUSE';
    _opacity.current += ((isLight ? 1 : 0) - _opacity.current) * 0.028;
    _scaleY.current  += ((isLight ? 1 : 0) - _scaleY.current)  * 0.022;

    const op    = _opacity.current;
    const sy    = _scaleY.current;
    const pulse = 0.72 + 0.28 * Math.sin(t * 2.4);
    const f     = op * pulse;

    if (innerRef.current) {
      innerRef.current.visible  = op > 0.01;
      innerRef.current.scale.y  = sy * 6.5;
      innerRef.current.material.opacity = f * 0.80;
    }
    if (outerRef.current) {
      outerRef.current.visible  = op > 0.01;
      outerRef.current.scale.y  = sy * 6.0;
      outerRef.current.material.opacity = f * 0.38;
    }
    if (glowRef.current) {
      glowRef.current.visible = op > 0.01;
      glowRef.current.material.opacity = f * 0.65;
    }
    if (lightHRef.current) {
      lightHRef.current.visible   = op > 0.01;
      lightHRef.current.intensity = f * 7.0;
    }
    if (lightCRef.current) {
      lightCRef.current.visible   = op > 0.01;
      lightCRef.current.intensity = f * 5.0;
    }
  });

  // Group positioned at heart node (y=0.72 in body local space)
  return (
    <group position={[0, 0.72, 0]}>

      {/* Inner gold core beam */}
      <mesh ref={innerRef} position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.030, 0.075, 5.5, 18, 1, true]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent opacity={0}
          side={THREE.DoubleSide} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer white halo beam */}
      <mesh ref={outerRef} position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.10, 0.20, 5.0, 26, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent opacity={0}
          side={THREE.DoubleSide} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Origin glow disc at heart */}
      <mesh ref={glowRef} position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial
          color="#ffe066"
          transparent opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Heart warm-gold point light */}
      <pointLight
        ref={lightHRef}
        color="#ffd700" intensity={0} distance={5.5} decay={1.5}
        position={[0, 0, 0.3]}
      />

      {/* Crown/third-eye white point light (1.20 above heart = y≈1.92 crown) */}
      <pointLight
        ref={lightCRef}
        color="#ffffff" intensity={0} distance={4.5} decay={1.5}
        position={[0, 1.20, 0.3]}
      />

    </group>
  );
}

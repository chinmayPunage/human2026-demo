import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBioStore } from '../store/bioStore';

/**
 * STATE A (COHERENT): 7 chakra spine nodes centred along the inner core
 * of the new organic body mesh. Coordinates recalibrated to LatheGeometry
 * torso + head geometry (body spans y ≈ -1.79 to +2.05).
 *
 * All positions are in body-group local space (body group at y=-0.1 in scene).
 */

// Root → Crown — aligned to inner spine of the new unified mesh
const CHAKRA_DEFS = [
  { y: -1.55, color: '#ff2244', label: 'Root'        }, // base of spine / pelvis floor
  { y: -0.55, color: '#ff6600', label: 'Sacral'      }, // sacral plexus
  { y:  0.10, color: '#ffcc00', label: 'Solar Plexus'}, // solar / navel
  { y:  0.72, color: '#00ee44', label: 'Heart'        }, // heart / mid sternum
  { y:  1.32, color: '#00ccff', label: 'Throat'       }, // throat / neck
  { y:  1.72, color: '#4466ff', label: 'Third Eye'    }, // brow / forehead
  { y:  1.92, color: '#cc44ff', label: 'Crown'        }, // top of head
];

function ChakraNode({ y, color, index }) {
  const meshRef  = useRef();
  const lightRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + index * 0.65);
    if (meshRef.current)  meshRef.current.scale.setScalar(0.65 + 0.45 * pulse);
    if (lightRef.current) lightRef.current.intensity = 0.7 + 1.6 * pulse;
  });

  return (
    <group position={[0, y, 0.02]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.048, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={1.2} distance={1.0} decay={2} />
    </group>
  );
}

export function ChakraNodes() {
  const animState = useBioStore(s => s.animState);
  const groupRef  = useRef();
  const _opacity  = useRef(0);

  useFrame(() => {
    const target = animState === 'COHERENT' ? 1 : 0;
    _opacity.current += (target - _opacity.current) * 0.05;
    if (groupRef.current) {
      groupRef.current.visible = _opacity.current > 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {CHAKRA_DEFS.map((def, i) => (
        <ChakraNode key={i} y={def.y} color={def.color} index={i} />
      ))}
      {/* Spine ambient glow */}
      <pointLight position={[0, 0.5, 0.1]} color="#ffffff" intensity={0.5} distance={2.8} decay={2} />
    </group>
  );
}

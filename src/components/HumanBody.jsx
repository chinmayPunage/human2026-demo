import { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useBioStore } from '../store/bioStore';

// Model: Three.js Soldier (Mixamo rig) — full humanoid body
// Mesh nodes: vanguard_Mesh (body) · vanguard_visor (helmet)
// GLB size: ~2.1 MB  |  Fully rigged with 4 idle animations

// ═══════════════════════════════════════════════════════════════════════════
// FRESNEL HOLOGRAM SHADER
// Edges glow bright; interior near-invisible. Scanline pulse + flicker.
// ═══════════════════════════════════════════════════════════════════════════
const HologramMaterial = shaderMaterial(
  {
    uColor:      new THREE.Color('#00e5ff'),
    uRim:        new THREE.Color('#ffffff'),
    uOpacity:    1.0,
    uFresnelPow: 4.5,
    uTime:       0.0,
    uFlicker:    0.0,
    uScanAlpha:  0.04,
  },
  /* ── Vertex Shader ── */
  `
    varying vec3  vNormal;
    varying vec3  vViewDir;
    varying vec2  vUv;
    varying float vWorldY;

    void main() {
      vUv      = uv;
      vNormal  = normalize(normalMatrix * normal);
      vec4 mv  = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mv.xyz);
      vWorldY  = (modelMatrix * vec4(position, 1.0)).y;
      gl_Position = projectionMatrix * mv;
    }
  `,
  /* ── Fragment Shader ── */
  `
    uniform vec3  uColor;
    uniform vec3  uRim;
    uniform float uOpacity;
    uniform float uFresnelPow;
    uniform float uTime;
    uniform float uFlicker;
    uniform float uScanAlpha;

    varying vec3  vNormal;
    varying vec3  vViewDir;
    varying vec2  vUv;
    varying float vWorldY;

    float rand(float n) { return fract(sin(n * 127.1) * 43758.5453); }

    void main() {
      /* ── Fresnel rim ── */
      float nv      = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
      float fresnel = pow(1.0 - nv, uFresnelPow);

      /* ── Scanline (sweeps upward) ── */
      float scan    = uScanAlpha * sin(vWorldY * 55.0 - uTime * 2.8);
      float base    = 0.04 + max(scan, 0.0);

      /* ── Calibrated flicker from MyoWare voltage range ── */
      float noise   = rand(floor(uTime * 22.0) + vWorldY * 3.1);
      float flick   = mix(1.0, 0.55 + 0.55 * noise, uFlicker);

      /* ── Rim-colour blend (white at peak Fresnel) ── */
      vec3  col     = mix(uColor, uRim, fresnel * 0.45);

      float alpha   = clamp((fresnel * 1.6 + base) * uOpacity, 0.0, 1.0) * flick;
      gl_FragColor  = vec4(col, alpha);
    }
  `
);
extend({ HologramMaterial });

// ═══════════════════════════════════════════════════════════════════════════
// TASK 3 — OPTIMISED STATE MAP
// High-contrast Fresnel power separates states visually at a glance.
// ═══════════════════════════════════════════════════════════════════════════
const STATE_MAP = {
  COHERENT:   { color: '#00e5ff', rim: '#aaffff', op: 1.00, frPow: 4.5, scan: 0.04 },
  STRESS:     { color: '#ff2200', rim: '#ff9900', op: 1.00, frPow: 1.6, scan: 0.15 },
  PEMF:       { color: '#8800ff', rim: '#cc66ff', op: 1.00, frPow: 2.8, scan: 0.08 },
  LIGHTHOUSE: { color: '#ffb700', rim: '#ffffff', op: 1.00, frPow: 3.5, scan: 0.20 },
};

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4 — DYNAMIC LERP SPEEDS
// STRESS: 0.15 (snap to red threat response)
// Recovery states: 0.03 (smooth, soothing release)
// ═══════════════════════════════════════════════════════════════════════════
const LERP_SPEED = (state) => state === 'STRESS' ? 0.15 : 0.03;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// Single-mesh GLTF loaded from /public/human_silhouette.gltf
// ═══════════════════════════════════════════════════════════════════════════
export function HumanBody() {
  const animState  = useBioStore(s => s.animState);
  const emgNeckEnv = useBioStore(s => s.emgNeckEnv);

  const matRef   = useRef();
  const groupRef = useRef();

  // ── Load real Mixamo-rigged humanoid from Three.js examples ──────────────
  // Saved locally to /public/ — avoids CORS and gives instant load via Vite
  const { nodes } = useGLTF('/human_silhouette.glb');

  // Smooth interpolation state refs
  const _col   = useRef(new THREE.Color('#00e5ff'));
  const _rim   = useRef(new THREE.Color('#aaffff'));
  const _op    = useRef(1.0);
  const _frPow = useRef(4.5);
  const _scan  = useRef(0.04);

  const shaderProps = {
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    blending:    THREE.AdditiveBlending,
  };

  useFrame(({ clock }) => {
    const t    = clock.elapsedTime;
    const cfg  = STATE_MAP[animState] || STATE_MAP.COHERENT;

    // ── TASK 4: Non-linear lerp speed ─────────────────────────────────────
    const k = LERP_SPEED(animState);

    _col.current.lerp(new THREE.Color(cfg.color), k);
    _rim.current.lerp(new THREE.Color(cfg.rim),   k);
    _op.current    += (cfg.op    - _op.current)    * k;
    _frPow.current += (cfg.frPow - _frPow.current) * k;
    _scan.current  += (cfg.scan  - _scan.current)  * k;

    // ── TASK 5: Calibrated flicker from MyoWare voltage range ─────────────
    // Resting noise floor: ~0.150 V  |  Active spasm threshold: ~0.550 V
    // Maps [0.150, 0.550] → [0.0, 1.0]  — clamped both ends.
    const flicker = animState === 'STRESS'
      ? THREE.MathUtils.clamp((emgNeckEnv - 0.150) / 0.40, 0.0, 1.0)
      : 0.0;

    if (matRef.current) {
      matRef.current.uColor.copy(_col.current);
      matRef.current.uRim.copy(_rim.current);
      matRef.current.uOpacity    = _op.current;
      matRef.current.uFresnelPow = _frPow.current;
      matRef.current.uTime       = t;
      matRef.current.uFlicker    = flicker;
      matRef.current.uScanAlpha  = _scan.current;
    }

    // ── Organic shoulder-guard deformation (STRESS only) ──────────────────
    // groupRef targets the INNER deformation group only — the outer scale
    // wrapper stays fixed at 0.02 so the lerp doesn't fight it.
    if (groupRef.current) {
      const tSY = animState === 'STRESS' ? 0.90 : 1.00;
      const tSX = animState === 'STRESS' ? 1.05 : 1.00;
      groupRef.current.scale.y += (tSY - groupRef.current.scale.y) * k;
      groupRef.current.scale.x += (tSX - groupRef.current.scale.x) * k;
    }
  });

  return (
    /*
     * rotation X = Math.PI/2 — rotates 90° to stand the Mixamo mesh upright.
     * position y = -1.9     — drops feet to sit cleanly on the ground grid.
     * scale    = 0.02       — converts Mixamo cm export to Three.js units.
     */
    <group
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.6, 0]}
      scale={[0.02, 0.02, 0.02]}
    >
      {/* Inner group: shoulder-guard deformation target (isolated from scale) */}
      <group ref={groupRef}>

        {/* PRIMARY BODY — vanguard_Mesh: full humanoid torso, arms, legs */}
        <skinnedMesh
          geometry={nodes.vanguard_Mesh.geometry}
          skeleton={nodes.vanguard_Mesh.skeleton}
        >
          <hologramMaterial ref={matRef} {...shaderProps} />
        </skinnedMesh>

        {/* VISOR — vanguard_visor: helmet / head detail layer */}
        <skinnedMesh
          geometry={nodes.vanguard_visor.geometry}
          skeleton={nodes.vanguard_visor.skeleton}
        >
          <hologramMaterial {...shaderProps}
            uColor={new THREE.Color('#00e5ff')}
            uRim={new THREE.Color('#aaffff')}
            uOpacity={1.0}
            uFresnelPow={4.5}
            uTime={0}
            uFlicker={0}
            uScanAlpha={0.04}
          />
        </skinnedMesh>

      </group>
    </group>
  );
}

// Preload eliminates first-frame stutter
useGLTF.preload('/human_silhouette.glb');

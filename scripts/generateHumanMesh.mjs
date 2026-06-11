/**
 * HUMAN2026 — High-Fidelity Anatomical Mesh Generator v2
 *
 * Uses variable-radius swept geometry (organic elliptical cross-sections along
 * a spine path) instead of LatheGeometry (circular cross-sections). This produces
 * a far more anatomically convincing humanoid silhouette: proper shoulder width,
 * realistic torso depth, tapered arms/legs.
 *
 * Output: /public/human_silhouette.gltf  (node: "HumanBodyMesh")
 *
 * Run: node scripts/generateHumanMesh.mjs
 */

import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Core: variable-ellipse swept geometry ────────────────────────────────
/**
 * Sweeps a series of elliptical cross-sections along a path.
 * @param {THREE.Vector3[]} spine    - centre-line points
 * @param {number[]}        radiiX   - X-axis (width)   radius at each spine point
 * @param {number[]}        radiiZ   - Z-axis (depth)   radius at each spine point
 * @param {number}          segments - circumference divisions (higher = smoother)
 */
function sweptEllipse(spine, radiiX, radiiZ, segments = 18) {
  const positions = [], normals = [], uvs = [];
  const indices   = [];
  const n = spine.length;

  for (let i = 0; i < n; i++) {
    const p  = spine[i];
    const rx = radiiX[i];
    const rz = radiiZ[i];

    // Local frame: forward along spine
    let fwd;
    if (i === 0)       fwd = spine[1].clone().sub(spine[0]).normalize();
    else if (i===n-1)  fwd = spine[n-1].clone().sub(spine[n-2]).normalize();
    else               fwd = spine[i+1].clone().sub(spine[i-1]).normalize();

    // Orthonormal basis
    const worldUp = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const cosT  = Math.cos(theta);
      const sinT  = Math.sin(theta);
      const cx = cosT * rx;
      const cy = sinT * rz;

      positions.push(
        p.x + right.x * cx + up.x * cy,
        p.y + right.y * cx + up.y * cy,
        p.z + right.z * cx + up.z * cy
      );

      // Ellipse normal (un-normalised gradient of ellipse equation)
      const nx = cosT / Math.max(rx * rx, 1e-6);
      const ny = sinT / Math.max(rz * rz, 1e-6);
      const nLen = Math.sqrt(nx*nx + ny*ny) || 1;
      normals.push(
        (right.x * nx + up.x * ny) / nLen,
        (right.y * nx + up.y * ny) / nLen,
        (right.z * nx + up.z * ny) / nLen
      );

      uvs.push(j / segments, i / (n - 1));
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i       * (segments + 1) + j;
      const b = (i + 1) * (segments + 1) + j;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setIndex(indices);
  return geo;
}

// ─── Helper: applyMatrix to a geometry in-place ────────────────────────────
function placed(geo, m4) {
  const g = geo.clone();
  g.applyMatrix4(m4);
  return g;
}
const mv = (x, y, z) => new THREE.Matrix4().setPosition(x, y, z);

// ─── Torso ────────────────────────────────────────────────────────────────
// Spine runs pelvis → neck base.  X = width, Z = depth (realistic 2:1.3 ratio)
const torsoSpine = [
  new THREE.Vector3(0, -0.74, 0),  // pelvis floor
  new THREE.Vector3(0, -0.55, 0),  // pelvis
  new THREE.Vector3(0, -0.32, 0),  // waist (narrowest)
  new THREE.Vector3(0, -0.08, 0),  // lower abdomen
  new THREE.Vector3(0,  0.18, 0),  // navel / solar plexus
  new THREE.Vector3(0,  0.40, 0),  // lower chest
  new THREE.Vector3(0,  0.62, 0),  // mid chest / sternum
  new THREE.Vector3(0,  0.80, 0),  // upper chest
  new THREE.Vector3(0,  0.92, 0),  // collar
  new THREE.Vector3(0,  1.00, 0),  // neck base
];
const torsoRX = [0.20, 0.28, 0.22, 0.24, 0.25, 0.28, 0.31, 0.36, 0.28, 0.11];
const torsoRZ = [0.13, 0.18, 0.14, 0.15, 0.16, 0.18, 0.20, 0.22, 0.17, 0.07];
const torsoGeo = sweptEllipse(torsoSpine, torsoRX, torsoRZ, 24);

// ─── Neck ─────────────────────────────────────────────────────────────────
const neckSpine = [
  new THREE.Vector3(0, 1.00, 0),
  new THREE.Vector3(0, 1.15, 0.00),
  new THREE.Vector3(0, 1.32, -0.02),
  new THREE.Vector3(0, 1.46, -0.01),
];
const neckRX = [0.10, 0.09, 0.085, 0.08];
const neckRZ = [0.07, 0.065, 0.060, 0.055];
const neckGeo = sweptEllipse(neckSpine, neckRX, neckRZ, 20);

// ─── Head ─────────────────────────────────────────────────────────────────
// Slightly oval (wider than deep), with cranial crown slight flattening at back
const headSpine = [
  new THREE.Vector3(0,  1.46, -0.01),  // base / jaw
  new THREE.Vector3(0,  1.58,  0.02),  // lower face
  new THREE.Vector3(0,  1.70,  0.03),  // cheeks
  new THREE.Vector3(0,  1.82,  0.02),  // upper face / brow
  new THREE.Vector3(0,  1.95, -0.01),  // forehead
  new THREE.Vector3(0,  2.04, -0.04),  // crown
  new THREE.Vector3(0,  2.09, -0.08),  // top (slightly posterior)
];
const headRX = [0.11, 0.18, 0.20, 0.19, 0.17, 0.13, 0.04];
const headRZ = [0.09, 0.14, 0.16, 0.15, 0.13, 0.10, 0.03];
const headGeo = sweptEllipse(headSpine, headRX, headRZ, 26);

// ─── Arms (tapered: thick at shoulder, thin at wrist) ─────────────────────
function buildOrgArm(side) {
  const s = side === 'L' ? -1 : 1;
  const spine = [
    new THREE.Vector3(s*0.36,  1.22,  0.00),  // shoulder socket
    new THREE.Vector3(s*0.46,  1.08,  0.03),  // upper arm
    new THREE.Vector3(s*0.55,  0.88,  0.06),  // elbow
    new THREE.Vector3(s*0.60,  0.66,  0.05),  // forearm upper
    new THREE.Vector3(s*0.63,  0.44,  0.03),  // forearm lower
    new THREE.Vector3(s*0.64,  0.24,  0.02),  // wrist
    new THREE.Vector3(s*0.64,  0.10,  0.01),  // hand root
  ];
  // Upper arm wider, tapers to wrist
  const rx = [0.095, 0.085, 0.074, 0.064, 0.055, 0.046, 0.042];
  const rz = [0.080, 0.072, 0.062, 0.054, 0.046, 0.038, 0.034];
  return sweptEllipse(spine, rx, rz, 16);
}

// ─── Shoulder caps ────────────────────────────────────────────────────────
function buildShoulder(side) {
  const s = side === 'L' ? -1 : 1;
  const spine = [
    new THREE.Vector3(s*0.25,  1.22, 0),
    new THREE.Vector3(s*0.31,  1.28, 0),
    new THREE.Vector3(s*0.38,  1.28, 0),
    new THREE.Vector3(s*0.44,  1.24, 0),
    new THREE.Vector3(s*0.48,  1.18, 0),
  ];
  const rx = [0.06, 0.10, 0.13, 0.13, 0.10];
  const rz = [0.05, 0.08, 0.10, 0.10, 0.08];
  return sweptEllipse(spine, rx, rz, 16);
}

// ─── Hands ────────────────────────────────────────────────────────────────
function buildHand(side) {
  const s = side === 'L' ? -1 : 1;
  const spine = [
    new THREE.Vector3(s*0.640,  0.10, 0.01),
    new THREE.Vector3(s*0.650, -0.02, 0.02),
    new THREE.Vector3(s*0.648, -0.08, 0.01),
  ];
  const rx = [0.040, 0.052, 0.030];
  const rz = [0.028, 0.038, 0.020];
  return sweptEllipse(spine, rx, rz, 14);
}

// ─── Legs (thick at thigh, tapers at calf) ────────────────────────────────
function buildOrgLeg(side) {
  const s = side === 'L' ? -1 : 1;
  const spine = [
    new THREE.Vector3(s*0.16, -0.58, 0.00),   // hip joint
    new THREE.Vector3(s*0.17, -0.80, 0.01),   // upper thigh
    new THREE.Vector3(s*0.18, -1.00, 0.02),   // mid thigh
    new THREE.Vector3(s*0.19, -1.18, 0.03),   // lower thigh
    new THREE.Vector3(s*0.18, -1.32, 0.02),   // knee
    new THREE.Vector3(s*0.17, -1.48, 0.01),   // upper shin
    new THREE.Vector3(s*0.16, -1.62, 0.00),   // lower shin
    new THREE.Vector3(s*0.16, -1.74, 0.00),   // ankle
  ];
  // Thigh wider, ankle thinner
  const rx = [0.115, 0.118, 0.112, 0.100, 0.082, 0.070, 0.062, 0.052];
  const rz = [0.090, 0.095, 0.090, 0.080, 0.065, 0.055, 0.048, 0.040];
  return sweptEllipse(spine, rx, rz, 18);
}

// ─── Feet ─────────────────────────────────────────────────────────────────
function buildFoot(side) {
  const s = side === 'L' ? -1 : 1;
  const spine = [
    new THREE.Vector3(s*0.160, -1.78, 0.00),
    new THREE.Vector3(s*0.165, -1.84, 0.04),
    new THREE.Vector3(s*0.160, -1.86, 0.09),
    new THREE.Vector3(s*0.155, -1.86, 0.14),
  ];
  const rx = [0.050, 0.060, 0.058, 0.040];
  const rz = [0.036, 0.044, 0.040, 0.028];
  return sweptEllipse(spine, rx, rz, 14);
}

// ─── Collect all sub-geometries ───────────────────────────────────────────
const geos = [
  torsoGeo,
  neckGeo,
  headGeo,
  buildShoulder('L'), buildShoulder('R'),
  buildOrgArm('L'),   buildOrgArm('R'),
  buildHand('L'),     buildHand('R'),
  buildOrgLeg('L'),   buildOrgLeg('R'),
  buildFoot('L'),     buildFoot('R'),
];

console.log(`Merging ${geos.length} organic swept geometries...`);

// ─── Merge ────────────────────────────────────────────────────────────────
const allPos = [], allNrm = [], allUV = [], allIdx = [];
let vertexOffset = 0;

for (const geo of geos) {
  geo.computeVertexNormals();

  const posArr = geo.attributes.position.array;
  const nrmArr = geo.attributes.normal.array;
  const uvArr  = geo.attributes.uv ? geo.attributes.uv.array : null;
  const idxArr = geo.index ? geo.index.array : null;
  const vCount = posArr.length / 3;

  for (let i = 0; i < posArr.length; i++) allPos.push(posArr[i]);
  for (let i = 0; i < nrmArr.length; i++) allNrm.push(nrmArr[i]);
  if (uvArr) for (let i = 0; i < uvArr.length; i++) allUV.push(uvArr[i]);
  else for (let i = 0; i < vCount * 2; i++) allUV.push(0);

  if (idxArr) {
    for (let i = 0; i < idxArr.length; i++) allIdx.push(idxArr[i] + vertexOffset);
  } else {
    for (let i = 0; i < vCount; i++) allIdx.push(i + vertexOffset);
  }
  vertexOffset += vCount;
}

const totalV = vertexOffset;
const totalI = allIdx.length;
console.log(`  → ${totalV} vertices · ${totalI} indices`);

// ─── Bounding box ─────────────────────────────────────────────────────────
let [mnX,mnY,mnZ] = [Infinity,Infinity,Infinity];
let [mxX,mxY,mxZ] = [-Infinity,-Infinity,-Infinity];
for (let i = 0; i < allPos.length; i+=3) {
  mnX=Math.min(mnX,allPos[i]);   mxX=Math.max(mxX,allPos[i]);
  mnY=Math.min(mnY,allPos[i+1]); mxY=Math.max(mxY,allPos[i+1]);
  mnZ=Math.min(mnZ,allPos[i+2]); mxZ=Math.max(mxZ,allPos[i+2]);
}

// ─── Binary buffer ────────────────────────────────────────────────────────
const posF32 = new Float32Array(allPos);
const nrmF32 = new Float32Array(allNrm);
const uvF32  = new Float32Array(allUV);
const useU32 = totalV > 65535;
const idxBuf = useU32 ? new Uint32Array(allIdx) : new Uint16Array(allIdx);

const align4 = n => Math.ceil(n/4)*4;
const bv0 = 0;
const bv1 = bv0 + align4(posF32.byteLength);
const bv2 = bv1 + align4(nrmF32.byteLength);
const bv3 = bv2 + align4(uvF32.byteLength);
const totalBytes = bv3 + align4(idxBuf.byteLength);

const bin = Buffer.alloc(totalBytes, 0);
Buffer.from(posF32.buffer).copy(bin, bv0);
Buffer.from(nrmF32.buffer).copy(bin, bv1);
Buffer.from(uvF32.buffer) .copy(bin, bv2);
Buffer.from(idxBuf.buffer).copy(bin, bv3);

const uri = 'data:application/octet-stream;base64,' + bin.toString('base64');

// ─── GLTF JSON ───────────────────────────────────────────────────────────
const gltf = {
  asset: { version: '2.0', generator: 'HUMAN2026-AnatomyGen-v2' },
  scene: 0,
  scenes: [{ name:'Scene', nodes:[0] }],
  nodes:  [{ name:'HumanBodyMesh', mesh:0 }],
  meshes: [{ name:'HumanBodyMesh', primitives:[{
    attributes: { POSITION:0, NORMAL:1, TEXCOORD_0:2 },
    indices: 3
  }]}],
  accessors: [
    { bufferView:0, byteOffset:0, componentType:5126, count:totalV, type:'VEC3', min:[mnX,mnY,mnZ], max:[mxX,mxY,mxZ] },
    { bufferView:1, byteOffset:0, componentType:5126, count:totalV, type:'VEC3' },
    { bufferView:2, byteOffset:0, componentType:5126, count:totalV, type:'VEC2' },
    { bufferView:3, byteOffset:0, componentType:useU32?5125:5123, count:totalI, type:'SCALAR' },
  ],
  bufferViews: [
    { buffer:0, byteOffset:bv0, byteLength:posF32.byteLength, target:34962 },
    { buffer:0, byteOffset:bv1, byteLength:nrmF32.byteLength, target:34962 },
    { buffer:0, byteOffset:bv2, byteLength:uvF32.byteLength,  target:34962 },
    { buffer:0, byteOffset:bv3, byteLength:idxBuf.byteLength, target:34963 },
  ],
  buffers: [{ byteLength:totalBytes, uri }]
};

// ─── Write ────────────────────────────────────────────────────────────────
const outDir  = resolve(__dirname, '../public');
const outPath = resolve(outDir, 'human_silhouette.gltf');
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(gltf));

const fileSizeKB = (JSON.stringify(gltf).length / 1024).toFixed(1);
console.log(`\n✅ human_silhouette.gltf written`);
console.log(`   Node name : "HumanBodyMesh"`);
console.log(`   Vertices  : ${totalV}`);
console.log(`   Triangles : ${totalI/3 | 0}`);
console.log(`   Y bounds  : [${mnY.toFixed(3)}, ${mxY.toFixed(3)}]`);
console.log(`   File size : ${fileSizeKB} KB`);

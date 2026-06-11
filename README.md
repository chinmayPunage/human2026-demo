# HUMAN2026 — Live 3D Bioadaptive Demo

Real-time WebGL holographic digital twin powered by Three.js, React Three Fiber, and mock BLE/EMG data streams.

## Stack
- Vite + React
- @react-three/fiber + @react-three/drei + @react-three/postprocessing
- Zustand state store
- Node.js WebSocket mock data server (Polar H10 + MyoWare EMG + PEMF)

## Setup

```bash
npm install
# Download the Soldier GLB model (too large for git):
curl -L "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb" \
  -o public/human_silhouette.glb

# Terminal 1 — mock data server
node server/mockDataServer.js

# Terminal 2 — frontend
npm run dev
```

## Bio-States
| State | Trigger | Visual |
|---|---|---|
| COHERENT | HRV high, sEMG low | Cyan edge glow, smooth scanlines |
| STRESS | sEMG spike >0.55V | Red/orange flicker, body crunch |
| PEMF | Loop active | Purple expanding rings |
| LIGHTHOUSE | Coherence peak | Gold beacon beam from heart node |

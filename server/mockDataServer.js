/**
 * HUMAN2026 — Mock BLE / ESP-NOW WebSocket Data Server
 * Simulates Polar H10, MyoWare EMG stacks, and PEMF Active Loop
 * at 10 Hz packet rate (100ms interval).
 *
 * 32-second demo loop:
 *   0–8s   STATE A (Coherent):   HRV high, sEMG low, PEMF IDLE
 *   8–16s  STATE B (Stress):     HRV drops, sEMG spikes, PEMF IDLE
 *   16–24s STATE C (PEMF):       PEMF ACTIVE, sEMG normalising
 *   24–32s LIGHTHOUSE:           Full coherence achieved
 */

import { WebSocketServer } from 'ws';

const PORT = 8765;
const LOOP_MS = 32000;
const TICK_MS = 100;

const wss = new WebSocketServer({ port: PORT });
console.log(`[HUMAN2026] Mock data server running on ws://localhost:${PORT}`);

/** Gaussian noise helper */
const noise = (amp = 1) => (Math.random() - 0.5) * 2 * amp;

/** Clamp helper */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Linear interpolation */
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

/**
 * Generate one packet based on demo phase.
 * @param {number} t  - time within loop (0 → 32000 ms)
 */
function generatePacket(t) {
  const phase = t / LOOP_MS; // 0.0 → 1.0

  // Phase boundaries
  const inA = t < 8000;
  const inB = t >= 8000 && t < 16000;
  const inC = t >= 16000 && t < 24000;
  const inL = t >= 24000;

  // ── Polar H10 ─────────────────────────────────────────────────────
  let bpm, hrv;
  if (inA) {
    bpm = clamp(58 + noise(2), 52, 65);
    hrv = clamp(62 + noise(3), 54, 72);
  } else if (inB) {
    const prog = (t - 8000) / 8000; // 0→1 within phase B
    bpm = clamp(lerp(58, 88, prog) + noise(3), 55, 96);
    hrv = clamp(lerp(62, 20, prog) + noise(4), 14, 65);
  } else if (inC) {
    const prog = (t - 16000) / 8000;
    bpm = clamp(lerp(88, 65, prog) + noise(2), 60, 92);
    hrv = clamp(lerp(20, 48, prog) + noise(3), 18, 52);
  } else {
    bpm = clamp(60 + noise(1.5), 56, 64);
    hrv = clamp(70 + noise(2), 62, 78);
  }

  // ── MyoWare Stack 1 — Neck / Trapezius ────────────────────────────
  let emg_neck_raw, emg_neck_env;
  if (inA) {
    emg_neck_raw = clamp(0.18 + noise(0.04), 0.10, 0.28);
    emg_neck_env = clamp(0.15 + noise(0.02), 0.10, 0.22);
  } else if (inB) {
    const prog = (t - 8000) / 8000;
    // Spiky raw signal during stress
    emg_neck_raw = clamp(lerp(0.18, 1.95, prog) + noise(0.25), 0.15, 2.4);
    emg_neck_env = clamp(lerp(0.15, 1.70, prog) + noise(0.08), 0.12, 2.0);
  } else if (inC) {
    const prog = (t - 16000) / 8000;
    emg_neck_raw = clamp(lerp(1.95, 0.22, prog) + noise(0.12), 0.10, 2.0);
    emg_neck_env = clamp(lerp(1.70, 0.18, prog) + noise(0.06), 0.10, 1.8);
  } else {
    emg_neck_raw = clamp(0.14 + noise(0.03), 0.08, 0.22);
    emg_neck_env = clamp(0.12 + noise(0.02), 0.08, 0.18);
  }

  // ── MyoWare Stack 2 — Deltoid ──────────────────────────────────────
  let emg_delt_baseline;
  if (inA) {
    emg_delt_baseline = clamp(0.12 + noise(0.02), 0.08, 0.18);
  } else if (inB) {
    const prog = (t - 8000) / 8000;
    emg_delt_baseline = clamp(lerp(0.12, 0.65, prog) + noise(0.08), 0.10, 0.80);
  } else if (inC) {
    const prog = (t - 16000) / 8000;
    emg_delt_baseline = clamp(lerp(0.65, 0.14, prog) + noise(0.04), 0.10, 0.70);
  } else {
    emg_delt_baseline = clamp(0.10 + noise(0.015), 0.07, 0.15);
  }

  // ── PEMF Active Loop ───────────────────────────────────────────────
  const pemf_state = (inC || inL) ? 'ACTIVE' : 'IDLE';
  const pemf_sensing_window = inC;

  // ── Derived animation state ────────────────────────────────────────
  let anim_state;
  if (inL)      anim_state = 'LIGHTHOUSE';
  else if (inC) anim_state = 'PEMF';
  else if (inB) anim_state = 'STRESS';
  else          anim_state = 'COHERENT';

  return {
    ts: Date.now(),
    anim_state,
    polar_h10: {
      bpm: Math.round(bpm),
      hrv_ms: parseFloat(hrv.toFixed(1)),
    },
    myoware_neck: {
      raw_mv: parseFloat(emg_neck_raw.toFixed(3)),
      envelope_mv: parseFloat(emg_neck_env.toFixed(3)),
    },
    myoware_delt: {
      baseline_mv: parseFloat(emg_delt_baseline.toFixed(3)),
    },
    pemf: {
      state: pemf_state,
      sensing_window_active: pemf_sensing_window,
    },
  };
}

let startTime = Date.now();

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

wss.on('connection', (ws) => {
  console.log('[HUMAN2026] Client connected');
  ws.on('close', () => console.log('[HUMAN2026] Client disconnected'));
});

setInterval(() => {
  const elapsed = (Date.now() - startTime) % LOOP_MS;
  const packet = generatePacket(elapsed);
  broadcast(packet);
}, TICK_MS);

import { create } from 'zustand';

/**
 * Global bio-sensor state store (Zustand).
 * Updated by useDataStream hook via WebSocket packets.
 */
export const useBioStore = create((set) => ({
  // Raw sensor values
  bpm:             60,
  hrv:             62,
  emgNeckRaw:      0.18,
  emgNeckEnv:      0.15,
  emgDeltBaseline: 0.12,
  pemfState:       'IDLE',
  pemfSensing:     false,

  // Derived animation state
  animState: 'COHERENT', // 'COHERENT' | 'STRESS' | 'PEMF' | 'LIGHTHOUSE'

  // Connection status
  connected: false,

  // Actions
  setPacket: (packet) => set({
    bpm:             packet.polar_h10.bpm,
    hrv:             packet.polar_h10.hrv_ms,
    emgNeckRaw:      packet.myoware_neck.raw_mv,
    emgNeckEnv:      packet.myoware_neck.envelope_mv,
    emgDeltBaseline: packet.myoware_delt.baseline_mv,
    pemfState:       packet.pemf.state,
    pemfSensing:     packet.pemf.sensing_window_active,
    animState:       packet.anim_state,
  }),

  setConnected: (v) => set({ connected: v }),
}));

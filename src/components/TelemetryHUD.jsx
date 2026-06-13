import { useState, useEffect } from 'react';
import { useBioStore } from '../store/bioStore';

const STATE_CONFIG = {
  COHERENT:   { label: 'STATE A — COHERENT',     color: '#00e5ff', bg: 'rgba(0,229,255,0.12)'   },
  STRESS:     { label: 'STATE B — STRESS GUARD',  color: '#ff4500', bg: 'rgba(255,69,0,0.12)'    },
  PEMF:       { label: 'STATE C — PEMF ACTIVE',   color: '#cc00ff', bg: 'rgba(204,0,255,0.12)'   },
  LIGHTHOUSE: { label: '✦ DIGITAL LIGHTHOUSE',    color: '#ffd700', bg: 'rgba(255,215,0,0.14)'   },
};

function Metric({ label, value, unit, color = '#00e5ff' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Courier New, monospace', lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 11, marginLeft: 4, color: 'rgba(255,255,255,0.5)' }}>{unit}</span>
      </div>
    </div>
  );
}

// Compact pill for mobile bottom bar
function MiniPill({ label, value, unit, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, padding: '6px 10px',
      background: 'rgba(2,4,10,0.82)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, minWidth: 64,
    }}>
      <span style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'Courier New, monospace', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 9, marginLeft: 2, color: 'rgba(255,255,255,0.45)' }}>{unit}</span>
      </span>
    </div>
  );
}

export function TelemetryHUD() {
  const {
    bpm, hrv,
    emgNeckRaw, emgNeckEnv,
    emgDeltBaseline,
    pemfState, pemfSensing,
    animState, connected,
  } = useBioStore();

  const cfg = STATE_CONFIG[animState] || STATE_CONFIG.COHERENT;

  // Responsive breakpoint detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace",
    }}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: isMobile ? '8px 14px' : '10px 20px',
        background: 'linear-gradient(to bottom, rgba(2,4,10,0.92) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 4, background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#00e5ff', fontWeight: 700, flexShrink: 0 }}>H26</div>
          {!isMobile && (
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, letterSpacing: '0.18em' }}>
              HUMAN2026 · BIOADAPTIVE DEMO
            </span>
          )}
          {isMobile && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: '0.12em' }}>
              HUMAN2026
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#00ff88' : '#ff4444', boxShadow: connected ? '0 0 8px #00ff88' : '0 0 8px #ff4444' }} />
          <span style={{ fontSize: 9, color: connected ? '#00ff88' : '#ff4444', letterSpacing: '0.1em' }}>
            {connected ? (isMobile ? 'LIVE' : 'DATA STREAM · LIVE') : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* ── State badge ────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: isMobile ? 46 : 52, left: '50%', transform: 'translateX(-50%)',
        padding: isMobile ? '4px 12px' : '5px 16px', borderRadius: 3,
        background: cfg.bg, border: `1px solid ${cfg.color}55`,
        color: cfg.color, fontSize: isMobile ? 10 : 11,
        letterSpacing: '0.14em', fontWeight: 700,
        transition: 'all 0.5s ease', whiteSpace: 'nowrap',
      }}>
        {cfg.label}
      </div>

      {/* ── DESKTOP: Left panel (Polar H10 + sEMG) ─────────────────── */}
      {!isMobile && (
        <div style={{
          position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(2,4,10,0.78)', border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 6, padding: '18px 20px', minWidth: 160,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>POLAR H10</div>
          <Metric label="Heart Rate" value={bpm}            unit="bpm" color="#ff6b6b" />
          <Metric label="HRV"        value={hrv.toFixed(1)} unit="ms"  color="#00e5ff" />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>MYOWARE sEMG</div>
          <Metric label="Neck Raw"  value={emgNeckRaw.toFixed(3)}     unit="V" color="#ffcc00" />
          <Metric label="Neck Env"  value={emgNeckEnv.toFixed(3)}     unit="V" color="#ffaa00" />
          <Metric label="Delt Base" value={emgDeltBaseline.toFixed(3)} unit="V" color="#ff8800" />
        </div>
      )}

      {/* ── DESKTOP: Right panel (PEMF) ─────────────────────────────── */}
      {!isMobile && (
        <div style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(2,4,10,0.78)', border: '1px solid rgba(204,0,255,0.2)',
          borderRadius: 6, padding: '18px 20px', minWidth: 160,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>PEMF ACTIVE LOOP</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>STATE</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 3, background: pemfState === 'ACTIVE' ? 'rgba(204,0,255,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${pemfState === 'ACTIVE' ? '#cc00ff55' : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: pemfState === 'ACTIVE' ? '#cc00ff' : '#555', boxShadow: pemfState === 'ACTIVE' ? '0 0 8px #cc00ff' : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: pemfState === 'ACTIVE' ? '#cc00ff' : '#666', letterSpacing: '0.1em' }}>{pemfState}</span>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>SENSING WINDOW</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: pemfSensing ? '#00ff88' : '#444', letterSpacing: '0.1em' }}>
              {pemfSensing ? '● INTERLEAVED' : '○ IDLE'}
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>ANIMATION STATE</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 3, background: cfg.bg, border: `1px solid ${cfg.color}44` }}>
            {animState}
          </div>
        </div>
      )}

      {/* ── MOBILE: Compact bottom stats strip ─────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 6,
          padding: '0 12px', flexWrap: 'nowrap', overflowX: 'auto',
          pointerEvents: 'none',
        }}>
          <MiniPill label="BPM"  value={bpm}                     unit=""    color="#ff6b6b" />
          <MiniPill label="HRV"  value={hrv.toFixed(0)}          unit="ms"  color="#00e5ff" />
          <MiniPill label="EMG"  value={emgNeckEnv.toFixed(2)}   unit="V"   color="#ffcc00" />
          <MiniPill label="PEMF" value={pemfState}               unit=""    color={pemfState === 'ACTIVE' ? '#cc00ff' : '#444'} />
        </div>
      )}

      {/* ── Bottom label (desktop only) ─────────────────────────────── */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', whiteSpace: 'nowrap',
        }}>
          HUMAN2026 · BIOADAPTIVE INTERFACE PLATFORM · CLOSED-LOOP ARCHITECTURE
        </div>
      )}

    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useBioStore } from '../store/bioStore';

const WS_URL = 'ws://localhost:8765';
const RECONNECT_MS = 2000;

/**
 * Connects to the mock WebSocket server and pipes packets
 * directly into the Zustand bio store.
 * Auto-reconnects on disconnect.
 */
export function useDataStream() {
  const setPacket    = useBioStore(s => s.setPacket);
  const setConnected = useBioStore(s => s.setConnected);
  const wsRef        = useRef(null);
  const timerRef     = useRef(null);

  function connect() {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[DataStream] Connected to', WS_URL);
      setConnected(true);
      clearTimeout(timerRef.current);
    };

    ws.onmessage = (e) => {
      try {
        const packet = JSON.parse(e.data);
        setPacket(packet);
      } catch (_) {}
    };

    ws.onclose = () => {
      console.warn('[DataStream] Disconnected — reconnecting in', RECONNECT_MS, 'ms');
      setConnected(false);
      timerRef.current = setTimeout(connect, RECONNECT_MS);
    };

    ws.onerror = () => ws.close();
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);
}

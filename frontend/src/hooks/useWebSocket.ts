import { useEffect, useRef, useCallback, useState } from 'react';
import type { EloSnapshot } from '@/types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

interface UseWebSocketOptions {
  /** Auto-reconnect on disconnect */
  reconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
}

export function useLeaderboardWebSocket(
  onUpdate: (snapshots: EloSnapshot[]) => void,
  options: UseWebSocketOptions = {},
) {
  const { reconnect = true, reconnectInterval = 5000 } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE_URL}/leaderboard`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'leaderboard_update' && Array.isArray(data.snapshots)) {
          onUpdate(data.snapshots);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnect) {
        reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onUpdate, reconnect, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}

import { useEffect, useRef, useState } from 'react';
import { api, type SessionInfo } from '../lib/api';

const POLL_MS = 1500;
const TICK_MS = 200;

interface UseSessionStateResult {
  session: SessionInfo | null;
  error: string | null;
  /** Giây còn lại, tick mượt ở client giữa 2 lần poll. Null nếu không active. */
  displaySeconds: number | null;
  refresh: () => Promise<void>;
}

export function useSessionState(sessionId: string | null): UseSessionStateResult {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);

  async function refresh() {
    if (!sessionId) return;
    try {
      const info = await api.getSession(sessionId);
      sessionRef.current = info;
      setSession(info);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được thông tin phiên bình chọn.');
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    refresh();
    const pollId = setInterval(refresh, POLL_MS);
    return () => clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const tickId = setInterval(() => {
      const s = sessionRef.current;
      if (!s) {
        setDisplaySeconds(null);
        return;
      }
      if (s.status === 'active' && s.ended_at) {
        const remainingMs = new Date(s.ended_at).getTime() - Date.now();
        setDisplaySeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
      } else if (s.status === 'paused' && s.remaining_seconds != null) {
        setDisplaySeconds(s.remaining_seconds);
      } else if (s.status === 'pending') {
        setDisplaySeconds(s.duration_seconds ?? null);
      } else {
        setDisplaySeconds(0);
      }
    }, TICK_MS);
    return () => clearInterval(tickId);
  }, []);

  return { session, error, displaySeconds, refresh };
}

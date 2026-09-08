import { useEffect, useState } from 'react';
import { api, ApiError, type ResultsInfo } from '../lib/api';
import { useSessionState } from '../hooks/useSessionState';
import { CountdownRing } from '../components/CountdownRing';
import { ResultsBoard } from '../components/ResultsBoard';
import { useAuth } from '../hooks/useAuth';

const DEFAULT_DURATION = Number(import.meta.env.VITE_DEFAULT_DURATION_SECONDS) || 30;

export function AdminPage({ sessionId }: { sessionId: string }) {
  const { signOut } = useAuth();
  const { session, error, displaySeconds, refresh } = useSessionState(sessionId);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voterCount, setVoterCount] = useState<number | null>(null);
  const [results, setResults] = useState<ResultsInfo | null>(null);

  useEffect(() => {
    if (!session || session.status === 'closed') return;
    const poll = () => api.selectionCount(sessionId).then((r) => setVoterCount(r.count)).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [sessionId, session?.status]);

  useEffect(() => {
    if (session?.status === 'closed') {
      api.getResults(sessionId).then(setResults).catch(() => {});
    } else {
      setResults(null);
    }
  }, [session?.status, sessionId]);

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <CenteredMessage title="Không tải được phiên bình chọn" detail={error} />;
  }
  if (!session) {
    return <CenteredMessage title="Đang tải..." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-amber">
          Bảng điều khiển MC
        </span>
        <button onClick={signOut} className="text-xs text-white/40 underline underline-offset-2">
          Đăng xuất
        </button>
      </header>

      <h1 className="font-display text-2xl font-bold leading-tight text-white">{session.question}</h1>
      <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
        Trạng thái: <StatusLabel status={session.status} />
      </p>

      <div className="mt-6 flex flex-1 flex-col items-center gap-6">
        {(session.status === 'active' || session.status === 'paused') && (
          <CountdownRing
            seconds={displaySeconds ?? 0}
            totalSeconds={session.duration_seconds ?? duration}
            paused={session.status === 'paused'}
            size={200}
          />
        )}

        {voterCount != null && session.status !== 'closed' && (
          <p className="text-sm text-white/60">{voterCount} người đã bình chọn</p>
        )}

        {(session.status === 'pending' || session.status === 'closed') && (
          <div className="flex w-full flex-col items-center gap-3">
            <label className="flex items-center gap-3 text-sm text-white/70">
              Thời gian đếm ngược
              <input
                type="number"
                min={5}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 rounded-lg border border-white/10 bg-stage-800 px-2 py-1 text-center
                  text-white focus:border-amber focus:outline-none"
              />
              giây
            </label>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.startSession(sessionId, duration))}
              className="w-full rounded-xl bg-emerald py-3 font-display font-semibold text-stage-900
                shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              {session.status === 'closed' ? 'Bắt đầu lại' : 'Bắt đầu bình chọn'}
            </button>
          </div>
        )}

        {session.status === 'active' && (
          <div className="flex w-full gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => api.pauseSession(sessionId))}
              className="flex-1 rounded-xl bg-sky py-3 font-display font-semibold text-white
                shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Tạm dừng
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-white
                shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Kết thúc ngay
            </button>
          </div>
        )}

        {session.status === 'paused' && (
          <div className="flex w-full gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => api.resumeSession(sessionId))}
              className="flex-1 rounded-xl bg-emerald py-3 font-display font-semibold text-stage-900
                shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Tiếp tục
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-white
                shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Kết thúc ngay
            </button>
          </div>
        )}

        {actionError && <p className="text-sm text-coral">{actionError}</p>}

        {session.status === 'closed' && (
          <div className="w-full">
            <h2 className="mb-4 text-center font-display text-xl font-bold text-amber">
              Kết quả bình chọn
            </h2>
            {results ? <ResultsBoard results={results} /> : <p className="text-center text-white/50">Đang tải...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Chờ bắt đầu',
    active: 'Đang mở',
    paused: 'Tạm dừng',
    closed: 'Đã chốt',
  };
  return <span className="text-white/70">{labels[status] ?? status}</span>;
}

function CenteredMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {detail && <p className="mt-2 text-sm text-white/50">{detail}</p>}
    </div>
  );
}

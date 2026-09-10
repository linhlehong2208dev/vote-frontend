import { useEffect, useState } from "react";
import { api, ApiError, type LiveStats, type ResultsInfo } from "../lib/api";
import { useSessionState } from "../hooks/useSessionState";
import { CountdownRing } from "../components/CountdownRing";
import { ResultsBoard } from "../components/ResultsBoard";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_DURATION =
  Number(import.meta.env.VITE_DEFAULT_DURATION_SECONDS) || 30;

const EMPTY_STATS: LiveStats = {
  joinedCount: 0,
  votedCount: 0,
  waitingCount: 0,
  optionCounts: {},
};

export function AdminPage({ sessionId }: { sessionId: string }) {
  const { signOut } = useAuth();
  const { session, error, displaySeconds, refresh } =
    useSessionState(sessionId);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS);
  const [results, setResults] = useState<ResultsInfo | null>(null);

  async function refreshStats() {
    try {
      const next = await api.getLiveStats(sessionId);
      setStats(next);
    } catch {
      // Realtime sẽ tiếp tục trigger lần refresh kế tiếp.
    }
  }

  // Initial load + realtime: join tạo vote_logs INSERT, chọn/đổi đáp án
  // tạo selections INSERT/UPDATE. Debounce nhẹ để tránh gọi API 2 lần liên tiếp
  // khi user vừa join vừa vote.
  useEffect(() => {
    if (!session || session.status === "closed") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refreshStats();
      }, 120);
    };

    void refreshStats();

    // Realtime là đường cập nhật chính. Polling 1.5s là fallback để Admin vẫn
    // cập nhật ngay cả khi browser/Supabase Realtime không giao event (ví dụ
    // tab mobile ngủ hoặc subscription vừa reconnect). Không cần F5.
    const pollId = setInterval(() => {
      void refreshStats();
    }, 1500);

    const channel = supabase
      .channel(`live-stats-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "selections",
          filter: `session_id=eq.${sessionId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vote_logs",
          filter: `session_id=eq.${sessionId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, session?.status]);

  useEffect(() => {
    if (session?.status === "closed") {
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
      await refreshStats();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Thao tác thất bại.",
      );
    } finally {
      setBusy(false);
    }
  }

  const totalVoted = stats.votedCount;

  if (error) {
    return (
      <CenteredMessage
        title="Không tải được phiên bình chọn"
        detail={error}
      />
    );
  }
  if (!session) {
    return <CenteredMessage title="Đang tải..." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-amber">
          Bảng điều khiển MC
        </span>
        <button
          onClick={signOut}
          className="text-xs text-white/40 underline underline-offset-2"
        >
          Đăng xuất
        </button>
      </header>

      <div className="rounded-2xl border border-white/10 bg-stage-800/80 p-5 shadow-tile">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {session.join_code && (
              <p className="mb-2 font-mono text-xs font-bold tracking-[0.22em] text-amber">
                MÃ {session.join_code}
              </p>
            )}
            <h1 className="font-display text-2xl font-bold leading-tight text-white">
              {session.question}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
              Trạng thái: <StatusLabel status={session.status} />
            </p>
          </div>
        </div>

        {(session.status === "active" || session.status === "paused") && (
          <div className="mt-6 flex justify-center">
            <CountdownRing
              seconds={displaySeconds ?? 0}
              totalSeconds={session.duration_seconds ?? duration}
              paused={session.status === "paused"}
              size={180}
            />
          </div>
        )}

        {session.status !== "closed" && (
          <LiveDashboard
            stats={stats}
            options={session.options}
            totalVoted={totalVoted}
          />
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {(session.status === "pending" || session.status === "closed") && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-stage-800/60 p-4">
            <label className="flex items-center gap-3 text-sm text-white/70">
              Thời gian đếm ngược
              <input
                type="number"
                min={5}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 rounded-lg border border-white/10 bg-stage-800 px-2 py-1 text-center text-white focus:border-amber focus:outline-none"
              />
              giây
            </label>
            <button
              disabled={busy}
              onClick={() =>
                runAction(() => api.startSession(sessionId, duration))
              }
              className="w-full rounded-xl bg-emerald py-3 font-display font-semibold text-stage-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              {session.status === "closed"
                ? "Bắt đầu lại"
                : "Bắt đầu bình chọn"}
            </button>
          </div>
        )}

        {session.status === "active" && (
          <div className="flex w-full gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => api.pauseSession(sessionId))}
              className="flex-1 rounded-xl bg-sky py-3 font-display font-semibold text-white shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Tạm dừng
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-white shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Kết thúc ngay
            </button>
          </div>
        )}

        {session.status === "paused" && (
          <div className="flex w-full gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => api.resumeSession(sessionId))}
              className="flex-1 rounded-xl bg-emerald py-3 font-display font-semibold text-stage-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Tiếp tục
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-white shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Kết thúc ngay
            </button>
          </div>
        )}

        {actionError && <p className="text-sm text-coral">{actionError}</p>}
      </div>

      {session.status === "closed" && (
        <div className="mt-6 w-full">
          <h2 className="mb-4 text-center font-display text-xl font-bold text-amber">
            Kết quả bình chọn
          </h2>
          {results ? (
            <ResultsBoard results={results} />
          ) : (
            <p className="text-center text-white/50">Đang tải...</p>
          )}
        </div>
      )}
    </div>
  );
}

function LiveDashboard({
  stats,
  options,
  totalVoted,
}: {
  stats: LiveStats;
  options: { id: string; label: string }[];
  totalVoted: number;
}) {
  return (
    <div className="mt-6">
      <div className="mb-4 grid grid-cols-3 gap-2">
        <MetricCard icon="👥" label="Joined" value={stats.joinedCount} />
        <MetricCard icon="🗳" label="Voted" value={stats.votedCount} />
        <MetricCard icon="⏳" label="Waiting" value={stats.waitingCount} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Câu trả lời
        </p>
        <div className="flex flex-col gap-2">
          {options.map((option, index) => {
            const count = stats.optionCounts[option.id] ?? 0;
            const percent =
              totalVoted > 0 ? Math.round((count / totalVoted) * 100) : 0;

            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-stage-800 px-4 py-3"
              >
                <div
                  className="absolute inset-y-0 left-0 opacity-10 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-display text-sm font-bold text-amber">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-white/90">
                    {option.label}
                  </span>
                  <span className="min-w-10 rounded-lg bg-white/10 px-2 py-1 text-right font-display text-sm font-bold text-white">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-stage-800 px-2 py-3 text-center">
      <div className="text-base">{icon}</div>
      <div className="mt-1 font-display text-xl font-bold text-white">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Chờ bắt đầu",
    active: "Đang mở",
    paused: "Tạm dừng",
    closed: "Đã chốt",
  };
  return <span className="text-white/70">{labels[status] ?? status}</span>;
}

function CenteredMessage({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {detail && <p className="mt-2 text-sm text-white/50">{detail}</p>}
    </div>
  );
}

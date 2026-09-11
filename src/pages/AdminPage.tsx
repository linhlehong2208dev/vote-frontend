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
  const [showClosingState, setShowClosingState] = useState(false);

  async function refreshStats() {
    try {
      const next = await api.getLiveStats(sessionId);
      setStats(next);
    } catch {
      // Realtime sáº½ tiáº¿p tá»¥c trigger láº§n refresh káº¿ tiáº¿p.
    }
  }

  // Initial load + realtime: join táº¡o vote_logs INSERT, chá»n/Ä‘á»•i Ä‘Ã¡p Ã¡n
  // táº¡o selections INSERT/UPDATE. Debounce nháº¹ Ä‘á»ƒ trÃ¡nh gá»i API 2 láº§n liÃªn tiáº¿p
  // khi user vá»«a join vá»«a vote.
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

    // Realtime lÃ  Ä‘Æ°á»ng cáº­p nháº­t chÃ­nh. Polling 1.5s lÃ  fallback Ä‘á»ƒ Admin váº«n
    // cáº­p nháº­t ngay cáº£ khi browser/Supabase Realtime khÃ´ng giao event (vÃ­ dá»¥
    // tab mobile ngá»§ hoáº·c subscription vá»«a reconnect). KhÃ´ng cáº§n F5.
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
      api
        .getResults(sessionId)
        .then(setResults)
        .catch(() => {});
    } else {
      setResults(null);
    }
  }, [session?.status, sessionId]);

  useEffect(() => {
    if (session?.status !== "active" || displaySeconds !== 0) {
      setShowClosingState(false);
      return;
    }

    setShowClosingState(true);
    const id = window.setTimeout(() => {
      setShowClosingState(false);
    }, 2000);

    return () => window.clearTimeout(id);
  }, [displaySeconds, session?.status]);

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
      await refreshStats();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Thao tÃ¡c tháº¥t báº¡i.",
      );
    } finally {
      setBusy(false);
    }
  }

  const totalVoted = stats.votedCount;

  if (error) {
    return (
      <CenteredMessage title="KhÃ´ng táº£i Ä‘Æ°á»£c phiÃªn bÃ¬nh chá»n" detail={error} />
    );
  }
  if (!session) {
    return <CenteredMessage title="Äang táº£i..." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-amber">
          Báº£ng Ä‘iá»u khiá»ƒn MC
        </span>
        <button
          onClick={signOut}
          className="text-xs text-ink-500 underline underline-offset-2"
        >
          ÄÄƒng xuáº¥t
        </button>
      </header>

      <div className="rounded-2xl border border-stage-700 bg-stage-800/80 p-5 shadow-tile">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {session.join_code && (
              <p className="mb-2 font-mono text-xs font-bold tracking-[0.22em] text-amber">
                MÃƒ {session.join_code}
              </p>
            )}
            <h1 className="font-display text-2xl font-bold leading-tight text-ink-900">
              {session.question}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">
              Tráº¡ng thÃ¡i: <StatusLabel status={session.status} />
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

        {session.status === "active" &&
          displaySeconds === 0 &&
          showClosingState && (
            <div className="mt-5 rounded-2xl border border-amber/20 bg-amber/10 px-4 py-3 text-center text-sm text-amber">
              <div className="mx-auto mb-2 h-9 w-9 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
              Äang chá»‘t káº¿t quáº£, vui lÃ²ng chá»â€¦
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
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stage-700 bg-stage-800/60 p-4">
            <label className="flex items-center gap-3 text-sm text-ink-700">
              Thá»i gian Ä‘áº¿m ngÆ°á»£c
              <input
                type="number"
                min={5}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 rounded-lg border border-stage-700 bg-stage-800 px-2 py-1 text-center text-ink-900 focus:border-amber focus:outline-none"
              />
              giÃ¢y
            </label>
            <button
              disabled={busy}
              onClick={() =>
                runAction(() => api.startSession(sessionId, duration))
              }
              className="w-full rounded-xl bg-emerald py-3 font-display font-semibold text-stage-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              {session.status === "closed"
                ? "Báº¯t Ä‘áº§u láº¡i"
                : "Báº¯t Ä‘áº§u bÃ¬nh chá»n"}
            </button>
          </div>
        )}

        {session.status === "active" && (
          <div className="flex w-full gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => api.pauseSession(sessionId))}
              className="flex-1 rounded-xl bg-sky py-3 font-display font-semibold text-ink-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Táº¡m dá»«ng
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-ink-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Káº¿t thÃºc ngay
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
              Tiáº¿p tá»¥c
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => api.closeSession(sessionId))}
              className="flex-1 rounded-xl bg-coral py-3 font-display font-semibold text-ink-900 shadow-tile transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
            >
              Káº¿t thÃºc ngay
            </button>
          </div>
        )}

        {actionError && <p className="text-sm text-coral">{actionError}</p>}
      </div>

      {session.status === "closed" && (
        <div className="mt-6 w-full">
          <h2 className="mb-4 text-center font-display text-xl font-bold text-amber">
            Káº¿t quáº£ bÃ¬nh chá»n
          </h2>
          {results ? (
            <ResultsBoard results={results} />
          ) : (
            <p className="text-center text-ink-500">Äang táº£i...</p>
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
        <MetricCard icon="ðŸ‘¥" label="Joined" value={stats.joinedCount} />
        <MetricCard icon="ðŸ—³" label="Voted" value={stats.votedCount} />
        <MetricCard icon="â³" label="Waiting" value={stats.waitingCount} />
      </div>

      <div className="rounded-2xl border border-stage-700 bg-black/10 p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
          CÃ¢u tráº£ lá»i
        </p>
        <div className="flex flex-col gap-2">
          {options.map((option, index) => {
            const count = stats.optionCounts[option.id] ?? 0;
            const percent =
              totalVoted > 0 ? Math.round((count / totalVoted) * 100) : 0;

            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-xl border border-stage-700 bg-stage-800 px-4 py-3"
              >
                <div
                  className="absolute inset-y-0 left-0 opacity-10 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-display text-sm font-bold text-amber">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink-900/90">
                    {option.label}
                  </span>
                  <span className="min-w-10 rounded-lg bg-white/10 px-2 py-1 text-right font-display text-sm font-bold text-ink-900">
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
    <div className="rounded-2xl border border-stage-700 bg-stage-800 px-2 py-3 text-center">
      <div className="text-base">{icon}</div>
      <div className="mt-1 font-display text-xl font-bold text-ink-900">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Chá» báº¯t Ä‘áº§u",
    active: "Äang má»Ÿ",
    paused: "Táº¡m dá»«ng",
    closed: "ÄÃ£ chá»‘t",
  };
  return <span className="text-ink-700">{labels[status] ?? status}</span>;
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
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {detail && <p className="mt-2 text-sm text-ink-500">{detail}</p>}
    </div>
  );
}


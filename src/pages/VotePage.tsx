// src/pages/VotePage.tsx
import { useEffect, useState } from "react";
import { api, type ResultsInfo } from "../lib/api";
import { useSessionState } from "../hooks/useSessionState";
import { CountdownRing } from "../components/CountdownRing";
import { OptionTile } from "../components/OptionTile";
import { ResultsBoard } from "../components/ResultsBoard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";

const CLOSING_GRACE_MS = 2000;

export function VotePage({ sessionId }: { sessionId: string }) {
  const { signOut } = useAuth();
  const { session, error, displaySeconds } = useSessionState(sessionId);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [joinedCount, setJoinedCount] = useState<number | null>(null);
  const [results, setResults] = useState<ResultsInfo | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showClosingState, setShowClosingState] = useState(false);

  const canVote =
    session?.status === "active" &&
    displaySeconds !== null &&
    displaySeconds > 0;

  useEffect(() => {
    if (!session || session.status === "closed") return;
    api.join(sessionId).catch((err) => setJoinError(err.message));
  }, [sessionId, session?.status]);

  useEffect(() => {
    if (session?.status !== "active" || displaySeconds !== 0) {
      setShowClosingState(false);
      return;
    }

    setShowClosingState(true);
    const id = window.setTimeout(() => {
      setShowClosingState(false);
    }, CLOSING_GRACE_MS);

    return () => window.clearTimeout(id);
  }, [displaySeconds, session?.status]);

  useEffect(() => {
    if (!session || session.status === "closed") return;

    const poll = () =>
      api
        .joinedCount(sessionId)
        .then((r) => setJoinedCount(r.count))
        .catch(() => {});

    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [sessionId, session?.status]);

  useEffect(() => {
    if (session?.status === "closed") {
      api
        .getResults(sessionId)
        .then(setResults)
        .catch(() => {});
    } else {
      setResults(null);
      setSelectedOptionId(null);
    }
  }, [session?.status, sessionId]);

  async function handleSelect(optionId: string) {
    if (!canVote || selecting) return;

    setSelecting(true);
    const previous = selectedOptionId;
    setSelectedOptionId(optionId);

    try {
      await api.select(sessionId, optionId);
    } catch (err) {
      setSelectedOptionId(previous);
    } finally {
      setSelecting(false);
    }
  }

  if (error) {
    return (
      <CenteredMessage title="Không tải được phiên bình chọn" detail={error} />
    );
  }

  if (!session) {
    return (
      <LoadingSpinner
        fullScreen
        variant="ring"
        label="Đang tải phiên bình chọn..."
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10 pt-6 animate-pageIn">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink-500">
          Bình chọn văn nghệ
        </span>

        <button
          onClick={signOut}
          className="text-xs text-ink-500 underline underline-offset-2 hover:text-ink-900"
        >
          Đăng xuất
        </button>
      </header>

      <h1 className="font-display text-2xl font-bold leading-tight text-ink-900">
        {session.question}
      </h1>

      {joinError && <p className="mt-2 text-xs text-coral">{joinError}</p>}

      <div className="mt-6 flex flex-1 flex-col items-center">
        {session.status === "pending" && (
          <WaitingPanel joinedCount={joinedCount} />
        )}

        {(session.status === "active" || session.status === "paused") && (
          <>
            <CountdownRing
              seconds={displaySeconds ?? 0}
              totalSeconds={session.duration_seconds ?? 30}
              paused={session.status === "paused"}
            />

            {joinedCount != null && (
              <p className="mt-3 text-sm text-ink-500">
                {joinedCount} người đã sẵn sàng
              </p>
            )}

            <div className="mt-6 flex w-full flex-col gap-3">
              {session.options.map((opt, i) => (
                <OptionTile
                  key={opt.id}
                  index={i}
                  label={opt.label}
                  selected={selectedOptionId === opt.id}
                  disabled={!canVote || selecting}
                  onSelect={() => handleSelect(opt.id)}
                />
              ))}
            </div>

            {session.status === "paused" && (
              <p className="mt-4 text-center text-sm text-sky">
                MC đang tạm dừng bình chọn, vui lòng chờ...
              </p>
            )}

            {session.status === "active" &&
              displaySeconds === 0 &&
              (showClosingState ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-amber/20 bg-amber/10 px-4 py-3 text-center text-sm text-amber">
                  <LoadingSpinner variant="ring" size="sm" />
                  <p className="font-semibold">
                    Đang chốt kết quả, vui lòng chờ…
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-coral">
                  Đã hết thời gian bình chọn.
                </p>
              ))}
          </>
        )}

        {session.status === "closed" && (
          <div className="flex w-full flex-col items-center">
            <h2 className="mb-4 font-display text-xl font-bold text-amber">
              Kết quả bình chọn
            </h2>

            {results ? (
              <ResultsBoard results={results} />
            ) : (
              <LoadingSpinner variant="dots" label="Đang tải kết quả..." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingPanel({ joinedCount }: { joinedCount: number | null }) {
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <LoadingSpinner variant="dots" />

      <p className="mt-5 font-display text-lg font-semibold text-ink-900">
        Chờ MC bắt đầu bình chọn
      </p>

      <p className="mt-2 max-w-xs text-sm text-ink-500">
        Các đáp án đang bị khóa. Khi MC bấm bắt đầu, bộ đếm giờ sẽ hiện ra và
        bạn có thể chọn.
      </p>

      {joinedCount != null && (
        <p className="mt-4 text-xs text-ink-500">
          {joinedCount} người đã sẵn sàng
        </p>
      )}
    </div>
  );
}

function CenteredMessage({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-pageIn">
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>

      {detail && <p className="mt-2 text-sm text-ink-500">{detail}</p>}
    </div>
  );
}

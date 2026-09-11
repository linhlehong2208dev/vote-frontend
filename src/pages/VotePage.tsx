import { useEffect, useState } from "react";
import { api, type ResultsInfo } from "../lib/api";
import { useSessionState } from "../hooks/useSessionState";
import { CountdownRing } from "../components/CountdownRing";
import { OptionTile } from "../components/OptionTile";
import { ResultsBoard } from "../components/ResultsBoard";
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

  // Chỉ được bình chọn khi session đang active VÀ vẫn còn thời gian.
  //
  // displaySeconds === null:
  // Chưa có dữ liệu timer => khóa tạm thời để tránh vote nhầm
  // trong khoảng thời gian frontend đang khởi tạo timer.
  const canVote =
    session?.status === "active" &&
    displaySeconds !== null &&
    displaySeconds > 0;

  // Mỗi vòng vote cần một log join. Khi session được "Bắt đầu lại", backend
  // xóa log của vòng cũ nên effect này phải chạy lại khi status đổi từ closed -> active.
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

  // Đếm số người đã JOIN (không phải số người đã vote). Polling nhẹ 1.5s giúp
  // màn hình chờ cập nhật ngay cả khi Realtime chưa kịp kết nối.
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

  // Khi đóng, tự động lấy kết quả. Khi mở lại vòng mới, xóa kết quả cũ ngay.
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
    // Frontend chặn vote khi:
    // - session không active
    // - timer chưa sẵn sàng
    // - timer đã hết
    // - đang gửi một request vote khác
    if (!canVote || selecting) return;

    setSelecting(true);

    const previous = selectedOptionId;

    // Optimistic UI
    setSelectedOptionId(optionId);

    try {
      await api.select(sessionId, optionId);
    } catch (err) {
      // Backend vẫn là nguồn sự thật.
      // Nếu backend từ chối (ví dụ vừa hết deadline),
      // rollback lựa chọn trên UI.
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
    return <CenteredMessage title="Đang tải..." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-white/40">
          Bình chọn văn nghệ
        </span>

        <button
          onClick={signOut}
          className="text-xs text-white/40 underline underline-offset-2"
        >
          Đăng xuất
        </button>
      </header>

      <h1 className="font-display text-2xl font-bold leading-tight text-white">
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
              <p className="mt-3 text-sm text-white/50">
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
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
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
              <p className="text-white/50">Đang tải kết quả...</p>
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
      <div className="mb-5 h-3 w-3 animate-pulseSlow rounded-full bg-amber" />

      <p className="font-display text-lg font-semibold text-white/90">
        Chờ MC bắt đầu bình chọn
      </p>

      <p className="mt-2 max-w-xs text-sm text-white/50">
        Các đáp án đang bị khóa. Khi MC bấm bắt đầu, bộ đếm giờ sẽ hiện ra và
        bạn có thể chọn.
      </p>

      {joinedCount != null && (
        <p className="mt-4 text-xs text-white/40">
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
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>

      {detail && <p className="mt-2 text-sm text-white/50">{detail}</p>}
    </div>
  );
}

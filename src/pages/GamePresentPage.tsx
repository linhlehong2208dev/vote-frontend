import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  type GameInfo,
  type GameParticipant,
  type GamePublicResults,
} from "../lib/api";

export function GamePresentPage({
  game,
  onGameUpdate,
  onExit,
}: {
  game: GameInfo;
  onGameUpdate: (g: GameInfo) => void;
  onExit: () => void;
}) {
  const [count, setCount] = useState(0);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [now, setNow] = useState(Date.now());
  const [advancing, setAdvancing] = useState(false);
  const [finalResults, setFinalResults] = useState<GamePublicResults | null>(
    null,
  );
  const current =
    game.questions?.find((q) => q.id === game.current_session_id) ??
    game.questions?.[0];
  const joinUrl = `${window.location.origin}/game/${game.pin}`;
  const serverNow = game.server_now ? new Date(game.server_now).getTime() : now;
  const seconds = current?.ended_at
    ? Math.max(
        0,
        Math.ceil((new Date(current.ended_at).getTime() - serverNow) / 1000),
      )
    : 0;
  const timeUp = Boolean(
    current && (current.status === "closed" || seconds <= 0),
  );

  const loadParticipants = async () => {
    try {
      const result = await api.getGameParticipants(game.id);
      setParticipants(result.participants);
      setCount(result.participants.length);
    } catch {
      try {
        setCount((await api.getGameParticipantCount(game.id)).count);
      } catch {
        /* transient */
      }
    }
  };

  const startGame = async () => {
    if (advancing || game.status !== "lobby") return;
    setAdvancing(true);
    try {
      onGameUpdate((await api.startGame(game.id)).game);
    } catch (error) {
      console.error("Không thể bắt đầu trò chơi:", error);
    } finally {
      setAdvancing(false);
    }
  };

  const handleNext = async () => {
    if (advancing || game.status !== "active") return;
    setAdvancing(true);
    try {
      onGameUpdate((await api.nextGameQuestion(game.id)).game);
    } catch (error) {
      console.error("Không thể chuyển câu hỏi:", error);
    } finally {
      setAdvancing(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    void loadParticipants();
    const t = setInterval(() => void loadParticipants(), 1500);
    return () => clearInterval(t);
  }, [game.id]);
  useEffect(() => {
    const t = setInterval(
      () =>
        api
          .getGame(game.id)
          .then((r) => onGameUpdate(r.game))
          .catch(() => {}),
      1500,
    );
    return () => clearInterval(t);
  }, [game.id, onGameUpdate]);
  useEffect(() => {
    if (game.status !== "closed") return;
    let cancelled = false;
    api
      .getGamePublicResults(game.id)
      .then((r) => {
        if (!cancelled) setFinalResults(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [game.id, game.status]);

  const background = useMemo(
    () =>
      game.background_type === "image" && game.background_value
        ? {
            backgroundImage: `url(${game.background_value})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : game.background_type === "color"
          ? { background: game.background_value || "#17102b" }
          : {
              background:
                game.background_value ||
                "linear-gradient(135deg,#17102b,#38216b)",
            },
    [game],
  );

  if (game.status === "lobby")
    return (
      <div
        className="min-h-screen overflow-hidden text-ink-900"
        style={background}
      >
        <div className="min-h-screen bg-black/25 px-5 py-5 md:px-8 md:py-7">
          <header className="mx-auto flex max-w-7xl items-center justify-between">
            <button
              onClick={onExit}
              className="rounded-xl bg-black/20 px-4 py-2 text-sm font-bold text-ink-500 transition hover:bg-black/30 hover:text-ink-900"
            >
              ← Quản lý Game
            </button>
            <div className="rounded-full border border-stage-700 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-ink-700">
              Host Lobby
            </div>
          </header>

          <main className="mx-auto grid min-h-[calc(100vh-105px)] max-w-7xl items-center gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <section className="min-w-0 rounded-[36px] border border-stage-700 bg-black/20 p-6 shadow-2xl backdrop-blur-md md:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-xs font-extrabold text-amber">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />{" "}
                  ĐANG CHỜ NGƯỜI CHƠI
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-ink-500">
                  {game.questions?.length ?? 0} câu hỏi
                </span>
              </div>
              {game.cover_url && (
                <img
                  src={game.cover_url}
                  alt=""
                  className="mt-6 h-20 w-20 rounded-2xl object-cover shadow-xl"
                />
              )}
              <h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-6xl">
                {game.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-900/45 md:text-base">
                Người chơi quét QR hoặc nhập Game PIN. Khi mọi người đã sẵn
                sàng, bạn có thể bắt đầu trò chơi.
              </p>

              <div className="mt-7 flex flex-wrap items-end gap-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.18em] text-ink-300">
                    TỔNG NGƯỜI THAM GIA
                  </p>
                  <p className="mt-1 font-display text-6xl font-black text-amber">
                    {count}
                  </p>
                </div>
                <div className="pb-2 text-sm font-semibold text-ink-300">
                  người chơi đang ở trong lobby
                </div>
              </div>

              <div className="mt-8 border-t border-stage-700 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-ink-300">
                      NGƯỜI THAM GIA
                    </p>
                    <p className="mt-1 text-sm text-ink-300">
                      Danh sách cập nhật tự động
                    </p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-ink-500">
                    {participants.length}
                  </span>
                </div>
                {participants.length ? (
                  <div className="mt-5 grid max-h-[250px] grid-cols-2 gap-3 overflow-y-auto pr-1 xl:grid-cols-3">
                    {participants.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex min-h-[92px] min-w-0 flex-col items-center justify-center rounded-[24px] bg-white/6 px-3 py-3 text-center shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-sm"
                      >
                        <span className="mb-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-ink-700">
                          {i + 1}
                        </span>
                        <span className="w-full truncate text-sm font-extrabold leading-5 text-ink-900">
                          {p.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-stage-700 px-5 py-8 text-center text-sm font-semibold text-ink-900/30">
                    Chưa có người chơi nào. Hãy chia sẻ QR hoặc Game PIN.
                  </div>
                )}
              </div>

              <button
                onClick={() => void startGame()}
                disabled={advancing || game.status !== "lobby"}
                className="mt-8 w-full rounded-2xl bg-amber py-4 font-display text-lg font-black text-stage-950 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-wait disabled:opacity-50"
              >
                {advancing ? "Đang bắt đầu…" : "Bắt đầu trò chơi →"}
              </button>
            </section>

            <aside className="rounded-[36px] border border-stage-700 bg-white/[.055] p-5 shadow-2xl backdrop-blur-xl md:p-7 lg:sticky lg:top-6">
              <div className="rounded-[28px] bg-white p-5 shadow-2xl md:p-6">
                <QRCodeSVG
                  value={joinUrl}
                  className="mx-auto h-auto w-full"
                  size={320}
                  level="M"
                />
              </div>
              <p className="mt-5 text-center text-sm font-bold text-ink-900/45">
                Quét mã để tham gia Game
              </p>
              <div className="mt-6 rounded-[28px] bg-black/25 p-6 text-center">
                <p className="text-xs font-extrabold uppercase tracking-[.25em] text-ink-300">
                  GAME PIN
                </p>
                <p className="mt-2 break-all font-mono text-5xl font-black tracking-[.16em] text-amber md:text-6xl">
                  {game.pin}
                </p>
                <p className="mt-3 text-xs leading-5 text-ink-900/30">
                  Mở {window.location.host}/game/{game.pin}
                </p>
              </div>
            </aside>
          </main>
        </div>
      </div>
    );

  if (game.status === "closed")
    return finalResults ? (
      <div className="min-h-screen bg-stage-950 px-5 py-8 text-ink-900 md:px-8">
        <main className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.3em] text-amber">
                FINAL RESULTS
              </p>
              <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">
                {finalResults.game.title}
              </h1>
            </div>
            <button
              onClick={onExit}
              className="rounded-2xl bg-white px-5 py-3 font-black text-stage-950"
            >
              ← Quản lý Game
            </button>
          </header>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-ink-900/45">
            <span className="rounded-full bg-white/8 px-4 py-2">
              {finalResults.participantCount} người chơi
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2">
              {finalResults.totalVotes} lượt vote
            </span>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {finalResults.questions.map((q) => {
              const max = Math.max(1, ...q.ranking.map((x) => x.votes));
              return (
                <section
                  key={q.questionId}
                  className="rounded-[28px] border border-stage-700 bg-white/[.045] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold text-amber">
                        CÂU {q.questionNumber}
                      </p>
                      <h2 className="mt-2 font-display text-xl font-black">
                        {q.question}
                      </h2>
                    </div>
                    <div className="text-right text-xs font-bold text-ink-500">
                      <p>{q.totalVotes} vote</p>
                      <p>{q.noAnswerCount} chưa trả lời</p>
                    </div>
                  </div>
                  <div className="mt-7 flex min-h-[260px] items-end gap-3 border-t border-stage-700 pt-5">
                    {q.ranking.map((item, i) => (
                      <div
                        key={item.optionId}
                        className="flex min-w-[70px] flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-sm font-black text-amber">
                          {item.votes}
                        </span>
                        <div className="flex h-44 w-full items-end rounded-xl bg-white/5">
                          <div
                            className="w-full rounded-xl bg-amber"
                            style={{
                              height: `${Math.max(item.votes ? 8 : 2, (item.votes / max) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-full truncate text-center text-xs font-bold text-ink-500">
                          {String.fromCharCode(65 + i)} · {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    ) : (
      <div className="grid min-h-screen place-items-center bg-stage-950 px-6 text-center text-ink-900">
        <div>
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-amber text-5xl text-stage-950">
            ✓
          </div>
          <p className="mt-7 text-sm font-extrabold uppercase tracking-[.3em] text-amber">
            GAME COMPLETE
          </p>
          <h1 className="mt-3 font-display text-5xl font-black md:text-7xl">
            Đang tải kết quả…
          </h1>
        </div>
      </div>
    );

  if (!current)
    return (
      <div className="grid min-h-screen place-items-center bg-stage-950 text-ink-900">
        Không có câu hỏi.
      </div>
    );
  return (
    <div
      className="min-h-screen text-ink-900"
      style={{
        background:
          current.background_type === "image" && current.background_value
            ? `url(${current.background_value}) center/cover`
            : current.background_type === "color"
              ? current.background_value || "#17102b"
              : current.background_value ||
                "linear-gradient(135deg,#17102b,#3c2472)",
      }}
    >
      <div className="min-h-screen bg-black/20 px-5 py-6 md:px-10 md:py-8">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">
            CÂU {current.sort_order} / {game.questions?.length}
          </div>
          <div
            className={`grid h-20 w-20 place-items-center rounded-full border-4 font-mono text-3xl font-black ${seconds <= 5 && !timeUp ? "border-coral bg-coral/20 text-coral animate-pulse" : "border-stage-700 bg-black/20"}`}
          >
            {timeUp ? 0 : seconds}
          </div>
          <div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">
            {count} người chơi
          </div>
        </div>
        <main className="mx-auto flex min-h-[calc(100vh-130px)] max-w-7xl flex-col justify-center">
          <div className="mx-auto w-full max-w-5xl rounded-[32px] bg-black/20 p-6 text-center backdrop-blur-sm md:p-10">
            <p className="text-sm font-extrabold uppercase tracking-[.25em] text-amber">
              QUESTION {current.sort_order}
            </p>
            <h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-6xl">
              {current.question}
            </h1>
            {current.image_url && (
              <img
                src={current.image_url}
                alt=""
                className="mx-auto mt-7 max-h-64 rounded-3xl object-cover"
              />
            )}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {current.options?.map((opt, i) => (
              <div
                key={opt.id}
                className="min-h-28 rounded-[24px] bg-white p-6 text-xl font-black text-stage-950 shadow-2xl md:text-2xl"
              >
                {String.fromCharCode(65 + i)}. {opt.label}
              </div>
            ))}
          </div>
          {timeUp && (
            <div className="mt-8 flex flex-col items-center gap-4 rounded-[28px] bg-black/30 p-6 backdrop-blur-sm">
              <p className="text-xl font-black">Hết giờ</p>
              <button
                disabled={advancing}
                onClick={() => void handleNext()}
                className="rounded-2xl bg-amber px-8 py-4 text-lg font-black text-stage-950 shadow-xl transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50"
              >
                {advancing
                  ? "Đang chuyển…"
                  : current.sort_order === (game.questions?.length ?? 0)
                    ? "Xem kết quả →"
                    : "Câu tiếp theo →"}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


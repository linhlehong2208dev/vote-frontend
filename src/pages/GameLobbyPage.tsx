import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type GameInfo } from "../lib/api";

const PLAYER_KEY = "vote_v2_player";

function getPlayer(gameId: string) {
  try {
    return JSON.parse(
      localStorage.getItem(`${PLAYER_KEY}:${gameId}`) || "null",
    ) as { displayName: string } | null;
  } catch {
    return null;
  }
}

export function GameLobbyPage({
  game,
  isAdmin,
  onGameUpdate,
  onStart,
  onBack,
}: {
  game: GameInfo;
  isAdmin: boolean;
  onGameUpdate: (g: GameInfo) => void;
  onStart?: () => void;
  onBack: () => void;
}) {
  const [count, setCount] = useState(0);
  const [name, setName] = useState(getPlayer(game.id)?.displayName ?? "");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const joinUrl = `${window.location.origin}/game/${encodeURIComponent(game.pin)}`;

  const loadCount = useCallback(async () => {
    try {
      setCount((await api.getGameParticipantCount(game.id)).count);
    } catch {
      /* transient */
    }
  }, [game.id]);

  useEffect(() => {
    void loadCount();
    const timer = window.setInterval(loadCount, 1500);
    return () => window.clearInterval(timer);
  }, [loadCount]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const fresh = (await api.getGame(game.id)).game;
        onGameUpdate(fresh);
      } catch {
        /* transient */
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.id, onGameUpdate]);

  useEffect(() => {
    if (!isAdmin && game.status === "active") onStart?.();
  }, [game.status, isAdmin, onStart]);

  const join = async () => {
    if (!name.trim()) return setError("Hãy nhập tên của bạn.");
    setJoining(true);
    setError("");
    try {
      await api.joinGame(game.id, name.trim());
      localStorage.setItem(
        `${PLAYER_KEY}:${game.id}`,
        JSON.stringify({ displayName: name.trim().slice(0, 80) }),
      );
      await loadCount();
    } catch (err: any) {
      setError(err?.message ?? "Không thể tham gia Game.");
    } finally {
      setJoining(false);
    }
  };

  const alreadyJoined = Boolean(getPlayer(game.id));
  const qrSize = 280;

  return (
    <div className="min-h-screen overflow-hidden bg-stage-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,182,39,.18),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(71,150,255,.12),transparent_35%)]" />
      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <button
          onClick={onBack}
          className="rounded-xl px-3 py-2 text-sm font-bold text-white/45 hover:bg-white/5 hover:text-white"
        >
          ← Trang chủ
        </button>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[.25em] text-amber">
            GAME PIN
          </p>
          <p className="font-mono text-xl font-black tracking-[.2em]">
            {game.pin}
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] max-w-6xl items-center gap-8 px-5 pb-10 md:grid-cols-[1fr_380px] md:px-8">
        <section className="text-center md:text-left">
          {game.cover_url && (
            <img
              src={game.cover_url}
              alt=""
              className="mb-7 h-24 w-24 rounded-3xl object-cover shadow-2xl md:h-28 md:w-28"
            />
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-xs font-extrabold text-amber">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />{" "}
            LOBBY OPEN
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            {game.title}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/45 md:text-base">
            Tham gia bằng QR hoặc nhập Game PIN. Bạn chỉ cần vào một lần — host
            sẽ đưa bạn đi qua toàn bộ câu hỏi.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 md:justify-start">
            <div className="rounded-2xl bg-white/7 px-5 py-4">
              <p className="text-xs font-bold text-white/35">NGƯỜI CHƠI</p>
              <p className="mt-1 font-display text-3xl font-black">{count}</p>
            </div>
            <div className="rounded-2xl bg-white/7 px-5 py-4">
              <p className="text-xs font-bold text-white/35">CÂU HỎI</p>
              <p className="mt-1 font-display text-3xl font-black">
                {game.questions?.length ?? 0}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[.055] p-5 shadow-2xl backdrop-blur-xl md:p-7">
          {!isAdmin && !alreadyJoined ? (
            <>
              <p className="text-center text-xs font-extrabold uppercase tracking-[.18em] text-white/40">
                SẴN SÀNG?
              </p>
              <h2 className="mt-2 text-center font-display text-2xl font-black">
                Nhập tên hiển thị
              </h2>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void join();
                }}
                maxLength={80}
                placeholder="Ví dụ: Lĩnh"
                className="mt-6 field-input text-center text-lg font-bold"
              />
              {error && (
                <p className="mt-3 text-center text-sm font-semibold text-coral">
                  {error}
                </p>
              )}
              <button
                disabled={joining}
                onClick={() => void join()}
                className="mt-4 w-full rounded-2xl bg-amber py-4 font-display text-base font-black text-stage-950 shadow-tile transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {joining ? "Đang tham gia…" : "Tham gia Game →"}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-emerald/15 text-3xl">
                  ✓
                </div>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-[.18em] text-emerald">
                  ĐÃ THAM GIA
                </p>
                <h2 className="mt-2 font-display text-2xl font-black">
                  {isAdmin ? "Lobby của Host" : `Xin chào, ${name}`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  {isAdmin
                    ? "Mở màn hình này trên TV / máy chiếu để hiển thị Game PIN và QR."
                    : "Hãy chờ Host bắt đầu. Bạn không cần quét QR lại."}
                </p>
              </div>
              {isAdmin && (
                <div className="mt-6 flex justify-center rounded-3xl bg-white p-4">
                  <QRCodeSVG value={joinUrl} size={qrSize} level="M" />
                </div>
              )}
              {isAdmin && (
                <div className="mt-5 rounded-2xl bg-black/20 p-5 text-center">
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-white/35">
                    GAME PIN
                  </p>
                  <p className="mt-2 font-mono text-5xl font-black tracking-[.22em] text-amber">
                    {game.pin}
                  </p>
                  <p className="mt-2 text-xs text-white/30">
                    Quét QR hoặc vào {window.location.host}/game/{game.pin}
                  </p>
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={onStart}
                  disabled={game.status !== "lobby"}
                  className="mt-5 w-full rounded-2xl bg-amber py-4 font-display font-black text-stage-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Bắt đầu Game →
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

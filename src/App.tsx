import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { VotePage } from "./pages/VotePage";
import { AdminPage } from "./pages/AdminPage";
import { UserProfileBar } from "./components/UserProfileBar";
import { isAdminEmail } from "./lib/isAdminEmail";
import { api, type GameInfo, type GamePublicResults } from "./lib/api";
import { AdminHomePage } from "./pages/AdminHomePage";
import { GameBuilderPage } from "./pages/GameBuilderPage";
import { GameLobbyPage } from "./pages/GameLobbyPage";
import { GameManagementPage } from "./pages/GameManagementPage";
import { GamePresentPage } from "./pages/GamePresentPage";

function getSessionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("session");
}
function getPath(): string {
  return window.location.pathname.replace(/\/$/, "") || "/";
}
function getJoinCodeFromUrl(): string | null {
  const m = window.location.pathname.match(/^\/join\/([^/]+)\/?$/i);
  return m ? decodeURIComponent(m[1]).trim().toUpperCase() : null;
}
function getGamePinFromUrl(): string | null {
  const m = window.location.pathname.match(/^\/game\/([^/]+)(?:\/.*)?$/i);
  return m ? decodeURIComponent(m[1]).trim().toUpperCase() : null;
}
type AdminView = "list" | "create";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualJoinCode, setManualJoinCode] = useState<string | null>(null);
  const [manualGamePin, setManualGamePin] = useState<string | null>(null);
  const [resolvedJoinSessionId, setResolvedJoinSessionId] = useState<
    string | null
  >(null);
  const [joinResolving, setJoinResolving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("list");
  const [game, setGame] = useState<GameInfo | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [, setRouteVersion] = useState(0);

  const path = getPath();
  const gamePin = getGamePinFromUrl() ?? manualGamePin;
  const urlSessionId = getSessionIdFromUrl();
  const joinCode = getJoinCodeFromUrl() ?? manualJoinCode;
  const isAdmin = isAdminEmail(profile?.email);

  useEffect(() => {
    const handlePopState = () => setRouteVersion((v) => v + 1);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    const pendingPath = sessionStorage.getItem("vote_auth_return_path");
    if (!pendingPath || !pendingPath.startsWith("/")) return;
    sessionStorage.removeItem("vote_auth_return_path");
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (pendingPath !== current) {
      window.history.replaceState({}, "", pendingPath);
      window.location.reload();
    }
  }, [loading, session]);

  useEffect(() => {
    if (
      !session ||
      !joinCode ||
      urlSessionId ||
      manualSessionId ||
      manualGamePin
    )
      return;
    let cancelled = false;
    setJoinResolving(true);
    setJoinError(null);

    // A V2 Game PIN must resolve through /api/games/pin/:pin.
    // Only fall back to the legacy V1 session-code endpoint when no Game exists.
    api
      .getGameByPin(joinCode)
      .then(({ game: found }) => {
        if (!cancelled) {
          setManualGamePin(found.pin);
          setManualJoinCode(null);
        }
      })
      .catch(() => {
        // Backward compatibility for old V1 join codes.
        api
          .getSessionByCode(joinCode)
          .then(({ session: found }) => {
            if (!cancelled) setResolvedJoinSessionId(found.id);
          })
          .catch((err) => {
            if (!cancelled)
              setJoinError(err.message ?? "MÃ£ phÃ²ng khÃ´ng há»£p lá»‡.");
          })
          .finally(() => {
            if (!cancelled) setJoinResolving(false);
          });
      })
      .finally(() => {
        // When a V2 Game was found, the game effect will take over.
        if (!cancelled && !manualGamePin) setJoinResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, joinCode, urlSessionId, manualSessionId, manualGamePin]);

  useEffect(() => {
    if (!session || !gamePin) return;
    let cancelled = false;
    setGameLoading(true);
    setGameError("");
    api
      .getGameByPin(gamePin)
      .then(async ({ game: found }) => {
        if (cancelled) return;
        if (found.status === "closed") {
          setGame(found);
          return;
        }
        const full = await api.getGame(found.id);
        if (!cancelled) setGame(full.game);
      })
      .catch((err) => {
        if (!cancelled) setGameError(err.message ?? "KhÃ´ng tÃ¬m tháº¥y Game.");
      })
      .finally(() => {
        if (!cancelled) setGameLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, gamePin]);

  const refreshGame = useCallback(async (id: string) => {
    const r = await api.getGame(id);
    setGame(r.game);
    return r.game;
  }, []);
  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (loading) return <FullScreenMessage text="Äang táº£iâ€¦" />;
  if (!session) return <LoginPage />;

  if (gamePin) {
    if (gameLoading)
      return <FullScreenMessage text={`Äang má»Ÿ Game ${gamePin}â€¦`} />;
    if (gameError || !game)
      return <FullScreenMessage text={gameError || "KhÃ´ng tÃ¬m tháº¥y Game."} />;
    if (isAdmin && path.endsWith("/present"))
      return (
        <GamePresentPage
          game={game}
          onGameUpdate={setGame}
          onExit={() => navigate(`/admin/games/${game.id}`)}
        />
      );
    if (game.status === "lobby" || game.status === "draft")
      return (
        <GameLobbyPage
          game={game}
          isAdmin={isAdmin}
          onGameUpdate={setGame}
          onStart={
            isAdmin
              ? async () => {
                  const updated = await api.startGame(game.id);
                  setGame(updated.game);
                  navigate(`/game/${game.pin}/present`);
                }
              : () => {}
          }
          onBack={() => navigate(isAdmin ? `/admin/games/${game.id}` : "/")}
        />
      );
    if (game.status === "active")
      return <GamePlayerActive game={game} onUpdate={setGame} />;
    return <GameClosedPage game={game} />;
  }

  const sessionId =
    urlSessionId ?? resolvedJoinSessionId ?? (manualSessionId.trim() || null);
  if (joinCode && !sessionId)
    return joinResolving ? (
      <FullScreenMessage text={`Äang má»Ÿ phÃ²ng ${joinCode}â€¦`} />
    ) : (
      <FullScreenMessage text={joinError ?? "KhÃ´ng tÃ¬m tháº¥y phÃ²ng."} />
    );

  if (isAdmin && !sessionId) {
    if (path === "/admin/games/new" || adminView === "create")
      return (
        <GameBuilderPage
          onBack={() => {
            setAdminView("list");
            navigate("/admin/games");
          }}
          onCreated={(id) => {
            setAdminView("list");
            navigate(`/admin/games/${id}`);
          }}
        />
      );
    if (path.startsWith("/admin/games/") && path !== "/admin/games/new") {
      const parts = path.split("/").filter(Boolean);
      const id = parts[2] ?? "";
      if (path.endsWith("/present"))
        return <FullScreenMessage text="Äang má»Ÿ Presentationâ€¦" />;
      if (path.endsWith("/edit"))
        return (
          <GameBuilderPage
            gameId={id}
            onBack={() => navigate(`/admin/games/${id}`)}
            onCreated={() => navigate(`/admin/games/${id}`)}
          />
        );
      return (
        <GameManagementPage
          gameId={id}
          onLobby={async () => {
            const g = await api.enterGameLobby(id);
            setGame(g.game);
            navigate(`/game/${g.game.pin}/present`);
          }}
          onEdit={() => navigate(`/admin/games/${id}/edit`)}
          onBack={() => navigate("/admin/games")}
        />
      );
    }
    return (
      <AdminHomePage
        onCreate={() => {
          setAdminView("create");
          navigate("/admin/games/new");
        }}
        onOpen={(id) => navigate(`/admin/games/${id}`)}
      />
    );
  }

  if (!sessionId)
    return (
      <SessionIdGate
        onSubmit={(value) => {
          const t = value.trim();
          if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(t)) setManualSessionId(t);
          else setManualJoinCode(t.toUpperCase());
        }}
      />
    );
  return isAdmin ? (
    <AdminPage sessionId={sessionId} />
  ) : (
    <VotePage sessionId={sessionId} />
  );
}

function PublicRanking({ result }: { result: GamePublicResults }) {
  const max = Math.max(
    1,
    ...result.questions.flatMap((q) => q.ranking.map((x) => x.votes)),
  );
  return (
    <div className="min-h-screen bg-stage-950 px-5 py-8 text-ink-900 md:px-8">
      <main className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.3em] text-amber">
            Káº¾T QUáº¢ GAME
          </p>
          <h1 className="mt-3 font-display text-4xl font-black md:text-6xl">
            {result.game.title}
          </h1>
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-bold text-ink-900/45">
            <span className="rounded-full bg-white/8 px-4 py-2">
              {result.participantCount} ngÆ°á»i chÆ¡i
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2">
              {result.totalVotes} lÆ°á»£t vote
            </span>
          </div>
        </div>
        <div className="mt-8 space-y-6">
          {result.questions.map((q) => (
            <section
              key={q.questionId}
              className="rounded-[28px] border border-stage-700 bg-white/[.045] p-5 md:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.18em] text-amber">
                    CÃ‚U {q.questionNumber}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-black md:text-2xl">
                    {q.question}
                  </h2>
                </div>
                <div className="shrink-0 text-right text-xs font-bold text-ink-500">
                  <p>{q.totalVotes} vote</p>
                  <p>{q.noAnswerCount} chÆ°a tráº£ lá»i</p>
                </div>
              </div>
              <div className="mt-7 flex min-h-[260px] items-end gap-3 overflow-x-auto border-t border-stage-700 pt-5">
                {q.ranking.map((item, i) => (
                  <div
                    key={item.optionId}
                    className="flex min-w-[72px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-sm font-black text-amber">
                      {item.votes}
                    </span>
                    <div className="flex h-44 w-full max-w-24 items-end rounded-xl bg-white/5">
                      <div
                        className="w-full rounded-xl bg-amber transition-all"
                        style={{
                          height: `${Math.max(item.votes ? 8 : 2, (item.votes / max) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-full truncate text-center text-xs font-bold text-ink-500">
                      {String.fromCharCode(65 + i)} Â· {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function GamePlayerActive({
  game,
  onUpdate,
}: {
  game: GameInfo;
  onUpdate: (g: GameInfo) => void;
}) {
  const current = game.questions?.find((q) => q.id === game.current_session_id);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(
    Boolean(localStorage.getItem(`vote_v2_player:${game.id}`)),
  );
  const [displayName, setDisplayName] = useState("");
  const [joinError, setJoinError] = useState("");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(
      () =>
        api
          .getGame(game.id)
          .then((r) => onUpdate(r.game))
          .catch(() => {}),
      1500,
    );
    return () => clearInterval(t);
  }, [game.id, onUpdate]);
  useEffect(() => {
    setSelected(null);
  }, [current?.id]);
  if (!current) return <FullScreenMessage text="Äang chá» cÃ¢u há»iâ€¦" />;
  if (!joined)
    return (
      <div className="grid min-h-screen place-items-center bg-stage-950 px-5 text-ink-900">
        <div className="w-full max-w-sm rounded-[28px] border border-stage-700 bg-white/[.05] p-6 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-amber">
            GAME ÄANG DIá»„N RA
          </p>
          <h1 className="mt-3 font-display text-2xl font-black">
            Tham gia ngay
          </h1>
          <input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setJoinError("");
            }}
            placeholder="TÃªn hiá»ƒn thá»‹"
            className="field-input mt-5 text-center"
          />
          {joinError && (
            <p className="mt-3 text-sm font-semibold text-coral">{joinError}</p>
          )}
          <button
            disabled={!displayName.trim() || busy}
            onClick={async () => {
              setBusy(true);
              setJoinError("");
              try {
                await api.joinGame(game.id, displayName.trim());
                localStorage.setItem(
                  `vote_v2_player:${game.id}`,
                  JSON.stringify({ displayName: displayName.trim() }),
                );
                setJoined(true);
              } catch (e: any) {
                setJoinError(e?.message ?? "KhÃ´ng thá»ƒ tham gia Game.");
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 w-full rounded-2xl bg-amber py-4 font-black text-stage-950 disabled:opacity-40"
          >
            {busy ? "Äang tham giaâ€¦" : "Tham gia â†’"}
          </button>
        </div>
      </div>
    );
  const serverNow = game.server_now ? new Date(game.server_now).getTime() : now;
  const seconds = current.ended_at
    ? Math.max(
        0,
        Math.ceil((new Date(current.ended_at).getTime() - serverNow) / 1000),
      )
    : 0;
  const timeUp = current.status === "closed" || seconds <= 0;
  const choose = async (id: string) => {
    if (busy || timeUp) return;
    setSelected(id);
    setBusy(true);
    try {
      await api.select(current.id, id);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-stage-950 px-4 py-5 text-ink-900 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/8 px-3 py-2 text-xs font-extrabold">
            CÃ‚U {current.sort_order}/{game.questions?.length}
          </span>
          <span
            className={`font-mono text-2xl font-black ${!timeUp && seconds <= 5 ? "text-coral animate-pulse" : "text-amber"}`}
          >
            {timeUp ? "0" : seconds}s
          </span>
        </div>
        <div className="mt-7 rounded-[28px] border border-stage-700 bg-white/[.05] p-6 text-center md:p-9">
          <h1 className="font-display text-2xl font-black leading-tight md:text-4xl">
            {current.question}
          </h1>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {current.options?.map((o, i) => (
            <button
              key={o.id}
              onClick={() => void choose(o.id)}
              disabled={busy || timeUp}
              className={`min-h-24 rounded-[22px] border-2 p-5 text-left font-display text-lg font-black transition active:scale-[.98] disabled:cursor-default disabled:opacity-80 ${selected === o.id ? "border-amber bg-amber text-stage-950 shadow-[0_0_30px_rgba(240,165,0,.25)]" : "border-stage-700 bg-white/7 hover:bg-white/10"}`}
            >
              <span className="mr-3 opacity-50">
                {String.fromCharCode(65 + i)}
              </span>
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          {timeUp ? (
            <p className="font-black text-amber">
              Háº¿t giá» â€” chá» ngÆ°á»i dáº«n chuyá»ƒn sang cÃ¢u tiáº¿p theo.
            </p>
          ) : (
            <p className="text-xs font-semibold text-ink-900/30">
              {selected
                ? "ÄÃ£ ghi nháº­n lá»±a chá»n. Báº¡n cÃ³ thá»ƒ Ä‘á»•i Ä‘Ã¡p Ã¡n."
                : "Chá»n má»™t Ä‘Ã¡p Ã¡n"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GameClosedPage({ game }: { game: GameInfo }) {
  const [result, setResult] = useState<GamePublicResults | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .getGamePublicResults(game.id)
      .then(setResult)
      .catch((e) => setError(e?.message ?? "KhÃ´ng thá»ƒ táº£i káº¿t quáº£."));
  }, [game.id]);
  if (result) return <PublicRanking result={result} />;
  return (
    <div className="grid min-h-screen place-items-center bg-stage-950 px-6 text-center text-ink-900">
      <div>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/8 text-4xl">
          âœ“
        </div>
        <h1 className="mt-6 font-display text-4xl font-black">
          Game Ä‘Ã£ káº¿t thÃºc
        </h1>
        <p className="mt-3 text-ink-500">{error || "Äang táº£i káº¿t quáº£â€¦"}</p>
        <p className="mt-6 font-mono text-sm tracking-widest text-amber">
          {game.pin}
        </p>
      </div>
    </div>
  );
}

function SessionIdGate({ onSubmit }: { onSubmit: (id: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-full max-w-xs">
        <UserProfileBar />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink-900">
          Nháº­p mÃ£ phÃ²ng
        </p>
        <p className="mt-2 max-w-xs text-sm text-ink-500">
          MÃ£ cÅ© cá»§a V1 váº«n Ä‘Æ°á»£c há»— trá»£.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value);
        }}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Game PIN / mÃ£ cÅ©"
          className="field-input"
        />
        <button className="rounded-xl bg-amber py-3 font-display font-semibold text-stage-900">
          VÃ o phÃ²ng
        </button>
      </form>
    </div>
  );
}
function FullScreenMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stage-950 text-ink-900">
      <p className="text-ink-700">{text}</p>
    </div>
  );
}


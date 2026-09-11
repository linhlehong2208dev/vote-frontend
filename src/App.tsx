import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { VotePage } from "./pages/VotePage";
import { AdminPage } from "./pages/AdminPage";
import { UserProfileBar } from "./components/UserProfileBar";
import { isAdminEmail } from "./lib/isAdminEmail";
import { api, type GameInfo } from "./lib/api";
import { AdminHomePage } from "./pages/AdminHomePage";
import { GameBuilderPage } from "./pages/GameBuilderPage";
import { GameLobbyPage } from "./pages/GameLobbyPage";
import { GameManagementPage } from "./pages/GameManagementPage";
import { GamePresentPage } from "./pages/GamePresentPage";

function getSessionIdFromUrl(): string | null { return new URLSearchParams(window.location.search).get("session"); }
function getPath(): string { return window.location.pathname.replace(/\/$/, "") || "/"; }
function getJoinCodeFromUrl(): string | null { const m=window.location.pathname.match(/^\/join\/([^/]+)\/?$/i); return m ? decodeURIComponent(m[1]).trim().toUpperCase() : null; }
function getGamePinFromUrl(): string | null { const m=window.location.pathname.match(/^\/game\/([^/]+)(?:\/.*)?$/i); return m ? decodeURIComponent(m[1]).trim().toUpperCase() : null; }
type AdminView = "list" | "create";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualJoinCode, setManualJoinCode] = useState<string | null>(null);
  const [resolvedJoinSessionId, setResolvedJoinSessionId] = useState<string | null>(null);
  const [joinResolving, setJoinResolving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("list");
  const [game, setGame] = useState<GameInfo | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [, setRouteVersion] = useState(0);

  const path = getPath();
  const gamePin = getGamePinFromUrl();
  const urlSessionId = getSessionIdFromUrl();
  const joinCode = getJoinCodeFromUrl() ?? manualJoinCode;
  const isAdmin = isAdminEmail(profile?.email);

  useEffect(() => {
    const handlePopState = () => setRouteVersion(v => v + 1);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    const pendingPath = sessionStorage.getItem("vote_auth_return_path");
    if (!pendingPath || !pendingPath.startsWith("/")) return;
    sessionStorage.removeItem("vote_auth_return_path");
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (pendingPath !== current) { window.history.replaceState({}, "", pendingPath); window.location.reload(); }
  }, [loading, session]);

  useEffect(() => {
    if (!session || !joinCode || urlSessionId || manualSessionId) return;
    let cancelled=false; setJoinResolving(true); setJoinError(null);
    api.getSessionByCode(joinCode).then(({session:found})=>{ if(!cancelled) setResolvedJoinSessionId(found.id); }).catch(err=>{if(!cancelled)setJoinError(err.message??"Mã câu hỏi không hợp lệ.")}).finally(()=>{if(!cancelled)setJoinResolving(false)});
    return ()=>{cancelled=true};
  }, [session, joinCode, urlSessionId, manualSessionId]);

  useEffect(() => {
    if (!session || !gamePin) return;
    let cancelled=false; setGameLoading(true); setGameError("");
    api.getGameByPin(gamePin).then(async ({game: found}) => {
      if (cancelled) return;
      if (found.status === "closed") { setGame(found); return; }
      const full = await api.getGame(found.id);
      if (!cancelled) setGame(full.game);
    }).catch(err=>{if(!cancelled)setGameError(err.message??"Không tìm thấy Game.")}).finally(()=>{if(!cancelled)setGameLoading(false)});
    return ()=>{cancelled=true};
  }, [session, gamePin]);

  const refreshGame = useCallback(async (id: string) => { const r=await api.getGame(id); setGame(r.game); return r.game; }, []);
  const navigate = (to: string) => { window.history.pushState({}, "", to); window.dispatchEvent(new PopStateEvent("popstate")); };

  if (loading) return <FullScreenMessage text="Đang tải…" />;
  if (!session) return <LoginPage />;

  if (gamePin) {
    if (gameLoading) return <FullScreenMessage text={`Đang mở Game ${gamePin}…`} />;
    if (gameError || !game) return <FullScreenMessage text={gameError || "Không tìm thấy Game."} />;
    if (isAdmin && path.endsWith("/present")) {
      return (
        <GamePresentPage
          game={game}
          onGameUpdate={setGame}
          onExit={() => navigate(`/admin/games/${game.id}`)}
          onStart={async () => {
            const updated = await api.startGame(game.id);
            setGame(updated.game);
          }}
        />
      );
    }
    if (game.status === "lobby" || game.status === "draft") return <GameLobbyPage game={game} isAdmin={isAdmin} onGameUpdate={setGame} onStart={isAdmin ? async()=>{ const updated=await api.startGame(game.id); setGame(updated.game); navigate(`/game/${game.pin}/present`); } : ()=>{}} onBack={()=>navigate(isAdmin?`/admin/games/${game.id}`:"/")} />;
    if (game.status === "active") return <GamePlayerActive game={game} onUpdate={setGame} />;
    return <GameClosedPage game={game} />;
  }

  const sessionId = urlSessionId ?? resolvedJoinSessionId ?? (manualSessionId.trim() || null);
  if (joinCode && !sessionId) return joinResolving ? <FullScreenMessage text={`Đang mở phòng ${joinCode}…`} /> : <FullScreenMessage text={joinError ?? "Không tìm thấy phòng."} />;

  if (isAdmin && !sessionId) {
    const editMatch = path.match(/^\/admin\/games\/([^/]+)\/edit$/i);
    if (editMatch) {
      const id = editMatch[1];
      return (
        <GameBuilderPage
          gameId={id}
          onBack={() => navigate(`/admin/games/${id}`)}
          onCreated={(savedId) => navigate(`/admin/games/${savedId}`)}
        />
      );
    }

    if (path === "/admin/games/new" || adminView === "create") {
      return <GameBuilderPage onBack={()=>{setAdminView("list");navigate("/admin/games")}} onCreated={id=>{setAdminView("list");navigate(`/admin/games/${id}`)}} />;
    }

    if (path.startsWith("/admin/games/") && path !== "/admin/games/new") {
      const match = path.match(/^\/admin\/games\/([^/]+)$/i);
      const id = match?.[1] ?? "";
      if (!id) return <FullScreenMessage text="Không tìm thấy Game." />;
      return <GameManagementPage gameId={id} onLobby={async()=>{ const g=await api.enterGameLobby(id); setGame(g.game); navigate(`/game/${g.game.pin}/present`); }} onEdit={()=>navigate(`/admin/games/${id}/edit`)} onBack={()=>navigate("/admin/games")} />;
    }
    return <AdminHomePage onCreate={()=>{setAdminView("create");navigate("/admin/games/new")}} onOpen={id=>navigate(`/admin/games/${id}`)} />;
  }

  if (!sessionId) return <SessionIdGate onSubmit={value=>{const t=value.trim();if(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(t))setManualSessionId(t);else setManualJoinCode(t.toUpperCase())}} />;
  return isAdmin ? <AdminPage sessionId={sessionId} /> : <VotePage sessionId={sessionId} />;
}

function GamePlayerActive({game,onUpdate}:{game:GameInfo;onUpdate:(g:GameInfo)=>void}) {
  const current=game.questions?.find(q=>q.id===game.current_session_id);
  const [now,setNow]=useState(Date.now());
  const [selected,setSelected]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [joined,setJoined]=useState(Boolean(localStorage.getItem(`vote_v2_player:${game.id}`)));
  const [displayName,setDisplayName]=useState("");
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(t)},[]);
  useEffect(()=>{const t=setInterval(()=>api.getGame(game.id).then(r=>onUpdate(r.game)).catch(()=>{}),1500);return()=>clearInterval(t)},[game.id,onUpdate]);
  useEffect(()=>{setSelected(null)},[current?.id]);
  if(!current)return <FullScreenMessage text="Đang chờ câu hỏi…"/>;
  if(!joined) return <div className="grid min-h-screen place-items-center bg-stage-950 px-5 text-white"><div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[.05] p-6 text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-amber">GAME ĐANG DIỄN RA</p><h1 className="mt-3 font-display text-2xl font-black">Tham gia ngay</h1><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Tên hiển thị" className="field-input mt-5 text-center"/><button disabled={!displayName.trim()} onClick={async()=>{await api.joinGame(game.id,displayName.trim());localStorage.setItem(`vote_v2_player:${game.id}`,JSON.stringify({displayName:displayName.trim()}));setJoined(true)}} className="mt-3 w-full rounded-2xl bg-amber py-4 font-black text-stage-950 disabled:opacity-40">Tham gia →</button></div></div>;
  const seconds=current.ended_at?Math.max(0,Math.ceil((new Date(current.ended_at).getTime()-now)/1000)):0;
  const choose=async(id:string)=>{if(busy||seconds<=0)return;setSelected(id);setBusy(true);try{await api.select(current.id,id)}finally{setBusy(false)}};
  return <div className="min-h-screen bg-stage-950 px-4 py-5 text-white md:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><span className="rounded-full bg-white/8 px-3 py-2 text-xs font-extrabold">CÂU {current.sort_order}/{game.questions?.length}</span><span className={`font-mono text-2xl font-black ${seconds<=5?"text-coral animate-pulse":"text-amber"}`}>{seconds}s</span></div><div className="mt-7 rounded-[28px] border border-white/10 bg-white/[.05] p-6 text-center md:p-9"><h1 className="font-display text-2xl font-black leading-tight md:text-4xl">{current.question}</h1></div><div className="mt-5 grid gap-3 md:grid-cols-2">{current.options?.map((o,i)=><button key={o.id} onClick={()=>void choose(o.id)} disabled={busy||seconds<=0} className={`min-h-24 rounded-[22px] border-2 p-5 text-left font-display text-lg font-black transition active:scale-[.98] disabled:opacity-50 ${selected===o.id?"border-amber bg-amber text-stage-950":"border-white/10 bg-white/7 hover:bg-white/10"}`}><span className="mr-3 opacity-50">{String.fromCharCode(65+i)}</span>{o.label}</button>)}</div><p className="mt-6 text-center text-xs font-semibold text-white/30">{selected?"Đã ghi nhận lựa chọn. Bạn có thể đổi đáp án.":"Chọn một đáp án"}</p></div></div>;
}

function GameClosedPage({game}:{game:GameInfo}) { return <div className="grid min-h-screen place-items-center bg-stage-950 px-6 text-center text-white"><div><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/8 text-4xl">✓</div><h1 className="mt-6 font-display text-4xl font-black">Game đã kết thúc</h1><p className="mt-3 text-white/40">{game.title}</p><p className="mt-6 font-mono text-sm tracking-widest text-amber">{game.pin}</p></div></div>; }

function SessionIdGate({ onSubmit }: { onSubmit: (id: string) => void }) { const [value,setValue]=useState(""); return <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"><div className="w-full max-w-xs"><UserProfileBar /></div><div><p className="font-display text-lg font-semibold text-white">Nhập mã phòng</p><p className="mt-2 max-w-xs text-sm text-white/50">Mã cũ của V1 vẫn được hỗ trợ.</p></div><form onSubmit={e=>{e.preventDefault();if(value.trim())onSubmit(value)}} className="flex w-full max-w-xs flex-col gap-3"><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Game PIN / mã cũ" className="field-input"/><button className="rounded-xl bg-amber py-3 font-display font-semibold text-stage-900">Vào phòng</button></form></div>; }
function FullScreenMessage({text}:{text:string}) { return <div className="flex min-h-screen items-center justify-center bg-stage-950 text-white"><p className="text-white/60">{text}</p></div>; }

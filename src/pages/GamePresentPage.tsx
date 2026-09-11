import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type GameDashboard, type GameInfo } from "../lib/api";

export function GamePresentPage({
  game,
  onGameUpdate,
  onExit,
  onStart,
}: {
  game: GameInfo;
  onGameUpdate: (g: GameInfo) => void;
  onExit: () => void;
  onStart?: () => void | Promise<void>;
}) {
  const [count, setCount] = useState(0);
  const [participants, setParticipants] = useState<{ id: string; displayName: string; joinedAt: string; lastSeenAt: string | null }[]>([]);
  const [now, setNow] = useState(Date.now());
  const [advancing, setAdvancing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [liveStats, setLiveStats] = useState<{ joinedCount: number; votedCount: number; waitingCount: number; optionCounts: Record<string, number> } | null>(null);
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);

  const current = game.questions?.find(q => q.id === game.current_session_id) ?? game.questions?.[0];
  const joinUrl = `${window.location.origin}/game/${game.pin}`;
  const seconds = current?.ended_at ? Math.max(0, Math.ceil((new Date(current.ended_at).getTime() - now) / 1000)) : 0;
  const timeUp = Boolean(current && (current.status === "closed" || seconds <= 0));
  const isLastQuestion = Boolean(current && current.sort_order === (game.questions?.length ?? 0));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () => api.getGameParticipants(game.id).then(r => { setParticipants(r.participants); setCount(r.participants.length); }).catch(() => {});
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [game.id]);

  useEffect(() => {
    const t = setInterval(() => api.getGame(game.id).then(r => onGameUpdate(r.game)).catch(() => {}), 1000);
    return () => clearInterval(t);
  }, [game.id, onGameUpdate]);

  useEffect(() => {
    if (!current || game.status !== "active") {
      setLiveStats(null);
      return;
    }
    const load = () => api.getGameLiveStats(game.id).then(setLiveStats).catch(() => {});
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, [game.id, game.status, current?.id]);

  const handleStart = async () => {
    if (starting || game.status !== "lobby") return;
    setStarting(true);
    try {
      if (onStart) await onStart();
      else { const result = await api.startGame(game.id); onGameUpdate(result.game); }
    } catch (error) { console.error("Không thể bắt đầu Game:", error); }
    finally { setStarting(false); }
  };

  const handleNext = async () => {
    if (advancing || game.status !== "active") return;
    setAdvancing(true);
    try { const result = await api.nextGameQuestion(game.id); onGameUpdate(result.game); }
    catch (error) { console.error("Không thể chuyển câu hỏi:", error); }
    finally { setAdvancing(false); }
  };

  // Câu cuối: khi timer hết thì tự đóng Game và chuyển thẳng sang bảng xếp hạng.
  useEffect(() => {
    if (!isLastQuestion || !timeUp || game.status !== "active" || advancing) return;
    const timer = window.setTimeout(() => { void handleNext(); }, 500);
    return () => window.clearTimeout(timer);
  }, [isLastQuestion, timeUp, game.status, advancing]);

  const background = useMemo(() =>
    game.background_type === "image" && game.background_value
      ? { backgroundImage: `url(${game.background_value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : game.background_type === "color"
        ? { background: game.background_value || "#17102b" }
        : { background: game.background_value || "linear-gradient(135deg,#17102b,#38216b)" }, [game]);

  if (game.status === "lobby") {
    return <div className="min-h-screen text-white" style={background}><div className="min-h-screen bg-black/20"><div className="flex items-center justify-between p-6"><button onClick={onExit} className="rounded-xl bg-black/20 px-4 py-2 text-sm font-bold text-white/60">Exit</button><div className="rounded-full bg-black/25 px-5 py-3 text-sm font-black">{count} người chơi</div></div><div className="mx-auto flex min-h-[calc(100vh-100px)] max-w-5xl flex-col items-center justify-center px-5 text-center"><p className="text-sm font-extrabold uppercase tracking-[.35em] text-amber">JOIN GAME</p><h1 className="mt-5 font-display text-5xl font-black md:text-8xl">{game.title}</h1><div className="mt-10 rounded-[32px] bg-white p-6 shadow-2xl"><QRCodeSVG value={joinUrl} size={300} level="M" /></div><p className="mt-7 text-lg font-bold text-white/60">Scan QR để tham gia</p><div className="mt-4 rounded-[28px] bg-black/25 px-10 py-6 backdrop-blur"><p className="text-xs font-extrabold uppercase tracking-[.25em] text-white/40">GAME PIN</p><p className="mt-2 font-mono text-6xl font-black tracking-[.25em] text-amber md:text-8xl">{game.pin}</p></div>{participants.length > 0 && <div className="mt-6 w-full max-w-3xl rounded-[28px] bg-black/25 p-5 text-left backdrop-blur"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-white/40">NGƯỜI THAM GIA</p><span className="text-sm font-black text-amber">{participants.length}</span></div><div className="mt-4 flex max-h-40 flex-wrap justify-center gap-2 overflow-auto">{participants.map((p, i) => <span key={p.id} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80">{i + 1}. {p.displayName}</span>)}</div></div>}<button onClick={() => void handleStart()} disabled={starting} className="mt-8 rounded-2xl bg-amber px-10 py-4 text-lg font-black text-stage-950 shadow-xl transition hover:scale-[1.02] disabled:opacity-50">{starting ? "Đang bắt đầu…" : "Bắt đầu Game →"}</button></div></div></div>;
  }

  if (game.status === "closed") return <FinalRankingDashboard gameId={game.id} gameTitle={game.title} pin={game.pin} onExit={onExit} initial={dashboard} setDashboard={setDashboard} />;
  if (!current) return <div className="grid min-h-screen place-items-center bg-stage-950 text-white">Không có câu hỏi.</div>;

  const total = liveStats?.joinedCount ?? count;
  const voted = liveStats?.votedCount ?? 0;
  const waiting = liveStats?.waitingCount ?? Math.max(0, total - voted);

  return <div className="min-h-screen text-white" style={{ background: current.background_type === "image" && current.background_value ? `url(${current.background_value}) center/cover` : current.background_type === "color" ? current.background_value || "#17102b" : current.background_value || "linear-gradient(135deg,#17102b,#3c2472)" }}><div className="min-h-screen bg-black/20 px-5 py-6 md:px-10 md:py-8"><div className="flex items-center justify-between"><div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">CÂU {current.sort_order} / {game.questions?.length}</div><div className={`grid h-20 w-20 place-items-center rounded-full border-4 font-mono text-3xl font-black ${seconds <= 5 && !timeUp ? "border-coral bg-coral/20 text-coral animate-pulse" : "border-white/30 bg-black/20"}`}>{timeUp ? 0 : seconds}</div><div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">{total} người chơi</div></div>
    <main className="mx-auto max-w-7xl py-8"><div className="rounded-[32px] bg-black/20 p-6 text-center backdrop-blur-sm md:p-10"><p className="text-sm font-extrabold uppercase tracking-[.25em] text-amber">QUESTION {current.sort_order}</p><h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-6xl">{current.question}</h1>{current.image_url && <img src={current.image_url} alt="" className="mx-auto mt-7 max-h-64 rounded-3xl object-cover" />}</div>
    <div className="mt-8 grid gap-4 md:grid-cols-2">{current.options?.map((opt, i) => { const voteCount = liveStats?.optionCounts?.[opt.id] ?? 0; return <div key={opt.id} className="min-h-28 rounded-[24px] bg-white p-5 text-stage-950 shadow-2xl"><div className="flex items-center justify-between gap-4"><div className="text-xl font-black md:text-2xl">{String.fromCharCode(65 + i)}. {opt.label}</div><div className="rounded-xl bg-stage-950 px-4 py-2 font-mono text-xl font-black text-amber">{voteCount}</div></div></div>; })}</div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-black/25 p-4 text-center backdrop-blur"><p className="text-xs font-bold text-white/45">ĐÃ THAM GIA</p><p className="mt-1 text-2xl font-black">{total}</p></div><div className="rounded-2xl bg-black/25 p-4 text-center backdrop-blur"><p className="text-xs font-bold text-white/45">ĐÃ BÌNH CHỌN</p><p className="mt-1 text-2xl font-black text-amber">{voted}</p></div><div className="rounded-2xl bg-black/25 p-4 text-center backdrop-blur"><p className="text-xs font-bold text-white/45">ĐANG CHỜ</p><p className="mt-1 text-2xl font-black">{waiting}</p></div></div>
    <div className="mt-7 flex justify-center">{timeUp && <button onClick={() => void handleNext()} disabled={advancing} className="rounded-2xl bg-amber px-8 py-4 font-black text-stage-950 shadow-xl disabled:opacity-50">{advancing ? "Đang xử lý…" : isLastQuestion ? "Xem bảng xếp hạng →" : "Câu tiếp theo →"}</button>}</div></main></div></div>;
}

function FinalRankingDashboard({ gameId, gameTitle, pin, onExit, initial, setDashboard }: { gameId: string; gameTitle: string; pin: string; onExit: () => void; initial: GameDashboard | null; setDashboard: (v: GameDashboard) => void }) {
  const [loading, setLoading] = useState(!initial);
  useEffect(() => { api.getGameDashboard(gameId).then(setDashboard).catch(() => {}).finally(() => setLoading(false)); }, [gameId, setDashboard]);
  if (loading || !initial) return <div className="grid min-h-screen place-items-center bg-stage-950 text-white"><p className="text-white/60">Đang tổng hợp bảng xếp hạng…</p></div>;
  return <div className="min-h-screen bg-stage-950 px-5 py-7 text-white md:px-10 md:py-10"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.25em] text-amber">GAME COMPLETE</p><h1 className="mt-2 font-display text-3xl font-black md:text-5xl">{gameTitle}</h1><p className="mt-2 text-sm text-white/40">PIN {pin} · {initial.participantCount} người tham gia · {initial.totalVotes} lượt vote</p></div><button onClick={onExit} className="rounded-xl bg-white/8 px-4 py-2 text-sm font-bold text-white/70">← Quản lý Game</button></header>
  <section className="mt-8 grid gap-5 md:grid-cols-3">{initial.questions.map(q => <QuestionVerticalRanking key={q.questionId} q={q} />)}</section>
  <section className="mt-8 rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/35">VOTE HISTORY</p><h2 className="mt-2 font-display text-2xl font-black">Lịch sử vote</h2></div><span className="text-xs font-bold text-white/35">Không hiển thị danh tính</span></div><div className="mt-5 max-h-[420px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-stage-900 text-xs uppercase tracking-wider text-white/35"><tr><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3">Câu</th><th className="px-3 py-3">Lựa chọn</th></tr></thead><tbody>{[...initial.voteHistory].reverse().map((row, i) => <tr key={`${row.timestamp}-${i}`} className="border-t border-white/5"><td className="px-3 py-3 font-mono text-xs text-white/55">{new Date(row.timestamp).toLocaleString("vi-VN")}</td><td className="px-3 py-3 font-bold">Q{row.questionNumber}</td><td className="px-3 py-3 text-white/70">{row.optionLabel}</td></tr>)}</tbody></table>{initial.voteHistory.length === 0 && <p className="py-10 text-center text-white/35">Chưa có lượt vote.</p>}</div></section></div></div>;
}

function QuestionVerticalRanking({ q }: { q: GameDashboard["questions"][number] }) {
  const max = Math.max(1, ...q.ranking.map(x => x.votes));
  return <article className="rounded-[28px] border border-white/10 bg-stage-900 p-5"><div className="min-h-[86px]"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-amber">CÂU {q.questionNumber}</p><h2 className="mt-2 line-clamp-3 font-display text-base font-black leading-6">{q.question}</h2></div><div className="mt-6 flex h-64 items-end justify-center gap-3 border-b border-white/10 px-2">{q.ranking.map((item, i) => <div key={item.optionId} className="flex h-full min-w-0 flex-1 max-w-20 flex-col items-center justify-end"><span className="mb-2 text-sm font-black text-white">{item.votes}</span><div className="w-full rounded-t-xl bg-amber transition-all" style={{ height: `${Math.max(6, (item.votes / max) * 82)}%` }} /><span className="mt-3 w-full truncate text-center text-xs font-bold text-white/60">{String.fromCharCode(65 + i)} · {item.label}</span></div>)}</div><div className="mt-4 flex justify-between text-xs text-white/35"><span>{q.totalVotes} lượt vote</span><span>{q.noAnswerCount} không chọn</span></div></article>;
}

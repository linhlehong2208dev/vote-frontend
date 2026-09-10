import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type GameInfo } from "../lib/api";

export function GamePresentPage({ game, onGameUpdate, onExit }: { game: GameInfo; onGameUpdate: (g: GameInfo) => void; onExit: () => void }) {
  const [count, setCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [advancing, setAdvancing] = useState(false);
  const current = game.questions?.find(q => q.id === game.current_session_id) ?? game.questions?.[0];
  const joinUrl = `${window.location.origin}/game/${game.pin}`;
  const seconds = current?.ended_at ? Math.max(0, Math.ceil((new Date(current.ended_at).getTime() - now) / 1000)) : 0;
  const timeUp = Boolean(current && (current.status === "closed" || seconds <= 0));

  const handleNext = async () => {
    if (advancing || game.status !== "active") return;
    setAdvancing(true);
    try {
      const result = await api.nextGameQuestion(game.id);
      onGameUpdate(result.game);
    } catch (error) {
      console.error("Không thể chuyển câu hỏi:", error);
    } finally {
      setAdvancing(false);
    }
  };

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { api.getGameParticipantCount(game.id).then(r => setCount(r.count)).catch(() => {}); const t = setInterval(() => api.getGameParticipantCount(game.id).then(r => setCount(r.count)).catch(() => {}), 1500); return () => clearInterval(t); }, [game.id]);
  useEffect(() => { const t = setInterval(() => api.getGame(game.id).then(r => onGameUpdate(r.game)).catch(() => {}), 1500); return () => clearInterval(t); }, [game.id, onGameUpdate]);

  const background = useMemo(() => game.background_type === "image" && game.background_value ? { backgroundImage: `url(${game.background_value})`, backgroundSize: "cover", backgroundPosition: "center" } : game.background_type === "color" ? { background: game.background_value || "#17102b" } : { background: game.background_value || "linear-gradient(135deg,#17102b,#38216b)" }, [game]);

  if (game.status === "lobby") return <div className="min-h-screen text-white" style={background}><div className="min-h-screen bg-black/20"><div className="flex items-center justify-between p-6"><button onClick={onExit} className="rounded-xl bg-black/20 px-4 py-2 text-sm font-bold text-white/60">Exit</button><div className="rounded-full bg-black/25 px-5 py-3 text-sm font-black">{count} người chơi</div></div><div className="mx-auto flex min-h-[calc(100vh-100px)] max-w-5xl flex-col items-center justify-center text-center"><p className="text-sm font-extrabold uppercase tracking-[.35em] text-amber">JOIN GAME</p><h1 className="mt-5 font-display text-5xl font-black md:text-8xl">{game.title}</h1><div className="mt-10 rounded-[32px] bg-white p-6 shadow-2xl"><QRCodeSVG value={joinUrl} size={300} level="M" /></div><p className="mt-7 text-lg font-bold text-white/60">Scan QR để tham gia</p><div className="mt-4 rounded-[28px] bg-black/25 px-10 py-6 backdrop-blur"><p className="text-xs font-extrabold uppercase tracking-[.25em] text-white/40">GAME PIN</p><p className="mt-2 font-mono text-6xl font-black tracking-[.25em] text-amber md:text-8xl">{game.pin}</p></div></div></div></div>;

  if (game.status === "closed") return <div className="grid min-h-screen place-items-center bg-stage-950 px-6 text-center text-white"><div><div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-amber text-5xl text-stage-950">✓</div><p className="mt-7 text-sm font-extrabold uppercase tracking-[.3em] text-amber">GAME COMPLETE</p><h1 className="mt-3 font-display text-5xl font-black md:text-7xl">Game đã kết thúc</h1><button onClick={onExit} className="mt-8 rounded-2xl bg-white px-6 py-3 font-black text-stage-950">Quay lại quản lý</button></div></div>;

  if (!current) return <div className="grid min-h-screen place-items-center bg-stage-950 text-white">Không có câu hỏi.</div>;
  return <div className="min-h-screen text-white" style={{ background: current.background_type === "image" && current.background_value ? `url(${current.background_value}) center/cover` : current.background_type === "color" ? current.background_value || "#17102b" : current.background_value || "linear-gradient(135deg,#17102b,#3c2472)" }}><div className="min-h-screen bg-black/20 px-5 py-6 md:px-10 md:py-8"><div className="flex items-center justify-between"><div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">CÂU {current.sort_order} / {game.questions?.length}</div><div className={`grid h-20 w-20 place-items-center rounded-full border-4 font-mono text-3xl font-black ${seconds <= 5 && !timeUp ? "border-coral bg-coral/20 text-coral animate-pulse" : "border-white/30 bg-black/20"}`}>{timeUp ? 0 : seconds}</div><div className="rounded-full bg-black/25 px-4 py-2 text-sm font-extrabold">{count} người chơi</div></div><main className="mx-auto flex min-h-[calc(100vh-130px)] max-w-7xl flex-col justify-center"><div className="mx-auto w-full max-w-5xl rounded-[32px] bg-black/20 p-6 text-center backdrop-blur-sm md:p-10"><p className="text-sm font-extrabold uppercase tracking-[.25em] text-amber">QUESTION {current.sort_order}</p><h1 className="mt-5 font-display text-4xl font-black leading-tight md:text-6xl">{current.question}</h1>{current.image_url && <img src={current.image_url} alt="" className="mx-auto mt-7 max-h-64 rounded-3xl object-cover" />}</div><div className="mt-8 grid gap-4 md:grid-cols-2">{current.options?.map((opt,i) => <div key={opt.id} className="min-h-28 rounded-[24px] bg-white p-6 text-xl font-black text-stage-950 shadow-2xl md:text-2xl">{String.fromCharCode(65+i)}. {opt.label}</div>)}</div>{timeUp && <div className="mt-8 flex flex-col items-center gap-4 rounded-[28px] bg-black/30 p-6 backdrop-blur-sm"><p className="text-xl font-black">Hết giờ</p><button disabled={advancing} onClick={() => void handleNext()} className="rounded-2xl bg-amber px-8 py-4 text-lg font-black text-stage-950 shadow-xl transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50">{advancing ? "Đang chuyển…" : current.sort_order === (game.questions?.length ?? 0) ? "Xem kết quả →" : "Câu tiếp theo →"}</button></div>}</main></div></div>;
}

import { useCallback, useEffect, useState } from "react";
import { api, type GameDashboard, type GameInfo } from "../lib/api";

const STATUS: Record<string, string> = { draft: "Bản nháp", lobby: "Lobby", active: "Đang live", closed: "Đã kết thúc" };
type Voter = { userId: string; displayName: string; optionId: string | null; timestamp: string };

export function GameManagementPage({ gameId, onLobby, onEdit, onBack }: { gameId: string; onLobby: () => void | Promise<void>; onEdit: () => void; onBack: () => void }) {
  const [game, setGame] = useState<GameInfo | null>(null);
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);
  const [live, setLive] = useState<{ participantCount: number; votedCount: number; waitingCount: number; optionCounts: Record<string, number> } | null>(null);
  const [liveVoters, setLiveVoters] = useState<Voter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([api.getGame(gameId), api.getGameDashboard(gameId)]);
      setGame(g.game); setDashboard(d); setError("");
      if (g.game.status === "active" && g.game.current_session_id) {
        const [stats, voters] = await Promise.all([
          api.getGameLiveStats(gameId),
          api.getQuestionVoters(gameId, g.game.current_session_id),
        ]);
        setLive(stats); setLiveVoters(voters.voters);
      } else {
        setLive(null); setLiveVoters([]);
      }
    } catch (e: any) { setError(e?.message ?? "Không thể tải dashboard."); }
  }, [gameId]);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 2000); return () => clearInterval(t); }, [load]);

  if (!game || !dashboard) return <div className="grid min-h-screen place-items-center bg-stage-950 text-white"><p>Đang tải dashboard…</p></div>;
  const canEdit = game.status === "draft" || (game.status === "lobby" && dashboard.participantCount === 0);
  const totalVotes = dashboard.totalVotes + (live && game.status === "active" ? live.votedCount : 0);
  const current = game.current_session_id ? game.questions?.find(q => q.id === game.current_session_id) : null;

  return <div className="min-h-screen bg-stage-950 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-stage-950/90 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4"><button onClick={onBack} className="text-sm font-bold text-white/45">← My Games</button><div className="flex gap-2">{canEdit && <button onClick={onEdit} className="rounded-xl bg-white/8 px-4 py-2.5 text-sm font-bold">Chỉnh sửa</button>}<button onClick={async()=>{setBusy(true);try{await onLobby()}catch(e:any){setError(e?.message??"Không thể mở Lobby.")}finally{setBusy(false)}}} disabled={busy || !game.questions?.length || game.status === "active"} className="rounded-xl bg-amber px-4 py-2.5 text-sm font-black text-stage-950 disabled:opacity-40">{busy ? "Đang mở…" : game.status === "closed" ? "Mở lại Lobby →" : "Mở Lobby →"}</button></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.22em] text-amber">GAME DASHBOARD</p><h1 className="mt-2 font-display text-3xl font-black md:text-5xl">{game.title}</h1><p className="mt-2 text-sm text-white/40">PIN {game.pin} · {STATUS[game.status] ?? game.status}</p></div><button onClick={()=>void load()} className="rounded-xl bg-white/6 px-4 py-2 text-xs font-bold text-white/55">↻ Làm mới</button></div>
      {error && <div className="mt-5 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral">{error}</div>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Người tham gia" value={dashboard.participantCount} /><Metric label="Tổng lượt vote" value={totalVotes} /><Metric label="Số câu hỏi" value={dashboard.questions.length} /><Metric label="Trạng thái" value={STATUS[game.status] ?? game.status} text /></section>
      {game.status === "active" && live && <section className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Đã vote câu hiện tại" value={live.votedCount} /><Metric label="Đang chờ" value={live.waitingCount} /><Metric label="Tổng người online" value={live.participantCount} /></section>}

      {game.status === "active" && current && <section className="mt-7 rounded-[28px] border border-amber/20 bg-amber/5 p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-amber">LIVE VOTERS · CÂU {current.sort_order}</p><h2 className="mt-2 font-display text-2xl font-black">Ai đã bình chọn</h2><p className="mt-1 text-xs text-white/35">Chỉ Admin thấy danh tính người vote.</p></div><span className="rounded-full bg-amber/10 px-3 py-1.5 text-sm font-black text-amber">{liveVoters.length} người</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{liveVoters.map(v => <div key={`${v.userId}-${v.timestamp}`} className="rounded-2xl bg-black/20 px-4 py-3"><p className="font-bold">{v.displayName}</p><p className="mt-1 text-xs text-white/40">{current.options?.find(o => o.id === v.optionId)?.label ?? "Không chọn"} · {new Date(v.timestamp).toLocaleTimeString("vi-VN")}</p></div>)}{liveVoters.length === 0 && <p className="py-5 text-sm text-white/35">Chưa có người bình chọn.</p>}</div></section>}

      <section className="mt-7"><div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/35">RANKING BY QUESTION</p><h2 className="mt-2 font-display text-2xl font-black">Bảng xếp hạng từng câu</h2></div><div className="grid gap-5 lg:grid-cols-2">{dashboard.questions.map(q=><VerticalChart key={q.questionId} q={q} />)}</div></section>

      <section className="mt-7 rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/35">PARTICIPANTS</p><h2 className="mt-2 font-display text-2xl font-black">Người tham gia</h2></div><span className="text-sm font-black text-amber">{dashboard.participants.length} người</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{dashboard.participants.map((p, i)=><div key={p.id} className="rounded-2xl bg-white/[.04] p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold">{p.displayName}</p><span className="text-xs font-mono text-white/25">#{i+1}</span></div><p className="mt-2 text-xs text-white/35">Tham gia {new Date(p.joinedAt).toLocaleString("vi-VN")}</p></div>)}</div>{dashboard.participants.length===0&&<p className="py-10 text-center text-white/30">Chưa có người tham gia.</p>}</section>

      <section className="mt-7 rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/35">VOTE HISTORY</p><h2 className="mt-2 font-display text-2xl font-black">Lịch sử vote</h2></div><span className="text-xs font-bold text-amber">Admin view · có danh tính</span></div><div className="mt-5 max-h-[520px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-stage-900 text-[11px] uppercase tracking-wider text-white/35"><tr><th className="px-3 py-3">Timestamp</th><th className="px-3 py-3">Người vote</th><th className="px-3 py-3">Câu</th><th className="px-3 py-3">Lựa chọn</th></tr></thead><tbody>{[...dashboard.voteHistory].reverse().map((r,i)=><tr key={`${r.timestamp}-${r.userId}-${i}`} className="border-t border-white/5"><td className="px-3 py-3 font-mono text-xs text-white/55">{new Date(r.timestamp).toLocaleString("vi-VN")}</td><td className="px-3 py-3 font-bold">{r.displayName}</td><td className="px-3 py-3 font-bold">Q{r.questionNumber}</td><td className="px-3 py-3 text-white/70">{r.optionLabel}</td></tr>)}</tbody></table>{dashboard.voteHistory.length===0&&<p className="py-12 text-center text-white/30">Chưa có lượt vote.</p>}</div></section>
    </main>
  </div>;
}

function Metric({label,value,text=false}:{label:string;value:number|string;text?:boolean}){return <div className="rounded-[22px] border border-white/10 bg-stage-900 p-5"><p className="text-xs font-extrabold uppercase tracking-[.12em] text-white/35">{label}</p><p className={`mt-3 font-display font-black ${text?"text-xl":"text-4xl"}`}>{value}</p></div>}
function VerticalChart({q}:{q:GameDashboard["questions"][number]}){const max=Math.max(1,...q.ranking.map(x=>x.votes));return <article className="rounded-[28px] border border-white/10 bg-stage-900 p-5"><div className="min-h-[86px]"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-amber">CÂU {q.questionNumber}</p><h2 className="mt-2 line-clamp-3 font-display text-base font-black leading-6">{q.question}</h2></div><div className="mt-6 flex h-64 items-end justify-center gap-3 border-b border-white/10 px-2">{q.ranking.map((item,i)=><div key={item.optionId} className="flex h-full min-w-0 flex-1 max-w-20 flex-col items-center justify-end"><span className="mb-2 text-sm font-black text-white">{item.votes}</span><div className="w-full rounded-t-xl bg-amber transition-all" style={{height:`${Math.max(6,(item.votes/max)*82)}%`}}/><span className="mt-3 w-full truncate text-center text-xs font-bold text-white/60">{String.fromCharCode(65+i)} · {item.label}</span></div>)}</div><div className="mt-4 flex justify-between text-xs text-white/35"><span>{q.totalVotes} lượt vote</span><span>{q.noAnswerCount} không chọn</span></div></article>}

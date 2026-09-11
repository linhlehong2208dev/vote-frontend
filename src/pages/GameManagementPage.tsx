import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type GameDashboard, type GameInfo } from "../lib/api";

function fmtTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function BarChart({ ranking }: { ranking: GameDashboard["questions"][number]["ranking"] }) {
  const max = Math.max(1, ...ranking.map(x => x.votes));
  return (
    <div className="mt-5 flex min-h-[240px] items-end gap-3 overflow-x-auto rounded-2xl bg-black/15 p-5">
      {ranking.map((item, i) => (
        <div key={item.optionId} className="flex min-w-[70px] flex-1 flex-col items-center justify-end gap-2">
          <span className="text-sm font-black text-amber">{item.votes}</span>
          <div className="flex h-40 w-full max-w-20 items-end rounded-xl bg-white/5">
            <div className="w-full rounded-xl bg-amber transition-all" style={{ height: `${Math.max(item.votes ? 8 : 2, item.votes / max * 100)}%` }} />
          </div>
          <span className="w-full truncate text-center text-xs font-bold text-white/55">{String.fromCharCode(65+i)} · {item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function GameManagementPage({ gameId, onLobby, onEdit, onBack }: { gameId: string; onLobby: () => void | Promise<void>; onEdit: () => void; onBack: () => void }) {
  const [game, setGame] = useState<GameInfo | null>(null);
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([api.getGame(gameId), api.getGameDashboard(gameId)]);
      setGame(g.game);
      setDashboard(d);
      setError("");
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải Dashboard.");
      try { setGame((await api.getGame(gameId)).game); } catch {}
    }
  }, [gameId]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), 2500); return () => window.clearInterval(t); }, [load]);

  if (!game) return <div className="grid min-h-screen place-items-center bg-stage-950 text-white">Đang tải Game…</div>;

  const action = async () => { setBusy(true); try { await onLobby(); } finally { setBusy(false); } };
  const questions = dashboard?.questions ?? [];

  return (
    <div className="min-h-screen bg-stage-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stage-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button onClick={onBack} className="text-sm font-bold text-white/45">← My Games</button>
          <div className="min-w-0 flex-1 px-4 text-center"><p className="truncate font-display text-lg font-black">{game.title}</p><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber">GAME DASHBOARD</p></div>
          <div className="flex gap-2">
            <button onClick={onEdit} disabled={game.status === "active" || game.status === "closed"} className="rounded-xl bg-white/8 px-4 py-2.5 text-sm font-bold disabled:opacity-30">Chỉnh sửa</button>
            <button onClick={() => void action()} disabled={busy || !game.questions?.length} className="rounded-xl bg-amber px-4 py-2.5 text-sm font-black text-stage-950 disabled:opacity-40">{busy ? "Đang mở…" : "Mở Lobby →"}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7">
        {error && <div className="mb-5 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["NGƯỜI THAM GIA", dashboard?.participantCount ?? 0],
            ["TỔNG LƯỢT VOTE", dashboard?.totalVotes ?? 0],
            ["SỐ CÂU HỎI", game.questions?.length ?? 0],
            ["TRẠNG THÁI", game.status === "active" ? "LIVE" : game.status.toUpperCase()],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-3xl border border-white/10 bg-white/[.045] p-5">
              <p className="text-xs font-extrabold tracking-[.15em] text-white/35">{label}</p>
              <p className="mt-2 font-display text-3xl font-black text-amber">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <section className="rounded-[28px] border border-white/10 bg-stage-900 p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-amber">RANKING</p><h2 className="mt-1 font-display text-2xl font-black">Kết quả từng câu</h2></div><button onClick={() => void load()} className="text-xs font-bold text-white/40">↻ Làm mới</button></div>
            <div className="mt-5 space-y-5">
              {questions.map(q => (
                <article key={q.id} className="rounded-2xl border border-white/8 bg-white/[.025] p-5">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold text-amber">CÂU {q.number}</p><h3 className="mt-1 font-display font-bold">{q.question}</h3></div><div className="text-right text-xs text-white/40"><p>{q.totalVotes} vote</p><p>{q.noAnswerCount} chưa trả lời</p></div></div>
                  <BarChart ranking={q.ranking} />
                  <p className="mt-3 text-xs text-white/30">Bắt đầu: {fmtTime(q.startedAt)} · Kết thúc: {fmtTime(q.endedAt)}</p>
                </article>
              ))}
              {!questions.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">Chưa có dữ liệu vote. Dashboard sẽ cập nhật khi người chơi tham gia.</div>}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-stage-900 p-6">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-amber">PARTICIPANTS</p>
              <h2 className="mt-1 font-display text-2xl font-black">Người tham gia</h2>
              <p className="mt-1 text-sm text-white/35">{dashboard?.participantCount ?? 0} người</p>
              <div className="mt-5 max-h-80 space-y-2 overflow-auto">
                {(dashboard?.participants ?? []).map((p, i) => <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/8 text-xs font-black text-white/45">{i+1}</span><span className="truncate font-bold">{p.display_name}</span></div><span className="shrink-0 text-[11px] text-white/30">{fmtTime(p.joined_at)}</span></div>)}
                {!dashboard?.participants?.length && <p className="py-8 text-center text-sm text-white/30">Chưa có người tham gia.</p>}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-stage-900 p-6">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-amber">VOTE HISTORY</p>
              <h2 className="mt-1 font-display text-2xl font-black">Lịch sử bình chọn</h2>
              <div className="mt-5 max-h-96 space-y-2 overflow-auto">
                {(dashboard?.voteHistory ?? []).map((v, i) => <div key={`${v.userId}-${v.questionId}-${i}`} className="rounded-2xl bg-white/5 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="font-bold">{v.displayName}</span><span className="text-[11px] text-white/30">{fmtTime(v.timestamp)}</span></div><p className="mt-1 text-xs text-white/40">Câu {v.questionNumber} · {v.label ?? "Không trả lời"}</p></div>)}
                {!dashboard?.voteHistory?.length && <p className="py-8 text-center text-sm text-white/30">Chưa có lượt vote.</p>}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

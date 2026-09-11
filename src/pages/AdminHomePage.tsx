import { useCallback, useEffect, useState } from "react";
import { api, type GameInfo } from "../lib/api";

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Báº£n nhÃ¡p", className: "bg-white/10 text-ink-700" },
  lobby: { label: "Lobby", className: "bg-sky/15 text-sky" },
  active: { label: "Äang live", className: "bg-emerald/15 text-emerald" },
  closed: { label: "ÄÃ£ káº¿t thÃºc", className: "bg-white/10 text-ink-900/45" },
};

export function AdminHomePage({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) {
  const [games, setGames] = useState<GameInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGames((current) => current ?? null);
      const result = await api.listGames();
      setGames(result.games);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch Game.");
      setGames([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-stage-950 text-ink-900">
      <header className="sticky top-0 z-20 border-b border-stage-700 bg-stage-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber">VOTE STUDIO</p>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight md:text-2xl">My Games</h1>
          </div>
          <button onClick={onCreate} className="rounded-2xl bg-amber px-4 py-3 text-sm font-extrabold text-stage-950 shadow-tile transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-tile-active">
            + Táº¡o Game
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <section className="mb-8 grid gap-4 md:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[28px] border border-stage-700 bg-gradient-to-br from-stage-800 to-stage-900 p-6 md:p-8">
            <p className="text-sm font-semibold text-ink-500">QUIZ & LIVE VOTING</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight md:text-5xl">
              Táº¡o má»™t Game. Cháº¡y nhiá»u cÃ¢u há»i. Má»™t PIN duy nháº¥t.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-500 md:text-base">
              Thiáº¿t káº¿ bá»™ cÃ¢u há»i, chá»n visual vÃ  sau Ä‘Ã³ Ä‘Æ°a Game lÃªn mÃ n hÃ¬nh lá»›n cho ngÆ°á»i chÆ¡i tham gia báº±ng QR hoáº·c Game PIN.
            </p>
            <button onClick={onCreate} className="mt-7 rounded-2xl bg-white px-5 py-3 font-display text-sm font-extrabold text-stage-950 transition hover:scale-[1.02]">
              Báº¯t Ä‘áº§u táº¡o Game â†’
            </button>
          </div>
          <div className="rounded-[28px] border border-stage-700 bg-stage-800 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">V2 foundation</p>
            <div className="mt-5 space-y-4">
              {[["01", "Game PIN", "Má»™t mÃ£ cho toÃ n bá»™ Game"], ["02", "Multi-question", "Nhiá»u cÃ¢u há»i trong cÃ¹ng má»™t lobby"], ["03", "Presentation", "Sáºµn sÃ ng cho mÃ n hÃ¬nh TV / projector"]].map(([n, title, desc]) => (
                <div key={n} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/8 text-xs font-extrabold text-amber">{n}</span>
                  <div><p className="font-display font-bold">{title}</p><p className="mt-0.5 text-xs leading-5 text-ink-500">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="font-display text-2xl font-extrabold">Game cá»§a báº¡n</h2><p className="mt-1 text-sm text-ink-500">Quáº£n lÃ½ cÃ¡c bá»™ cÃ¢u há»i vÃ  phiÃªn live.</p></div>
          <button onClick={() => void load()} className="text-xs font-bold text-ink-900/45 hover:text-ink-900">â†» LÃ m má»›i</button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral">{error}</div>}
        {games === null && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((x) => <div key={x} className="h-48 animate-pulse rounded-[24px] bg-white/5" />)}</div>}
        {games?.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-stage-700 bg-white/[0.02] px-6 py-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber/15 text-3xl">ï¼‹</div>
            <h3 className="mt-5 font-display text-xl font-extrabold">ChÆ°a cÃ³ Game nÃ o</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">Táº¡o Game Ä‘áº§u tiÃªn vÃ  thÃªm nhiá»u cÃ¢u há»i vÃ o cÃ¹ng má»™t bá»™.</p>
            <button onClick={onCreate} className="mt-6 rounded-2xl bg-amber px-5 py-3 text-sm font-extrabold text-stage-950">Táº¡o Game Ä‘áº§u tiÃªn</button>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games?.map((game) => {
            const status = STATUS[game.status] ?? STATUS.draft;
            return <button key={game.id} onClick={() => onOpen(game.id)} className="group overflow-hidden rounded-[24px] border border-stage-700 bg-stage-800 text-left transition hover:-translate-y-1 hover:border-stage-700 hover:shadow-2xl">
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-stage-700 to-stage-900">
                {game.cover_url && <img src={game.cover_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-stage-950/80 to-transparent" />
                <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-extrabold ${status.className}`}>{status.label}</span>
                <span className="absolute bottom-3 right-4 rounded-lg bg-black/30 px-2.5 py-1 font-mono text-xs font-bold tracking-[0.18em] text-ink-900">{game.pin}</span>
              </div>
              <div className="p-5"><h3 className="line-clamp-2 font-display text-lg font-extrabold">{game.title}</h3><p className="mt-2 text-xs text-ink-500">{new Date(game.created_at).toLocaleDateString("vi-VN")} Â· Má»Ÿ Ä‘á»ƒ quáº£n lÃ½</p></div>
            </button>;
          })}
        </div>
      </main>
    </div>
  );
}


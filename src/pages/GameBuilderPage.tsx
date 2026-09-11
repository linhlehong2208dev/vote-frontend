import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, type CreateGameInput, type GameBackgroundType } from "../lib/api";

interface DraftQuestion { id: number; question: string; options: string[]; durationSeconds: number; imageUrl: string; backgroundType: GameBackgroundType; backgroundValue: string; }

const defaultQuestion = (id: number): DraftQuestion => ({ id, question: "", options: ["", ""], durationSeconds: 20, imageUrl: "", backgroundType: "gradient", backgroundValue: "" });

export function GameBuilderPage({ gameId, onBack, onCreated }: { gameId?: string; onBack: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [backgroundType, setBackgroundType] = useState<GameBackgroundType>("gradient");
  const [backgroundValue, setBackgroundValue] = useState("linear-gradient(135deg,#6C2BD9,#2D7FF9)");
  const [questions, setQuestions] = useState<DraftQuestion[]>([defaultQuestion(1)]);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    void api.getGame(gameId).then(({ game }) => {
      setTitle(game.title);
      setCoverUrl(game.cover_url ?? "");
      setBackgroundType(game.background_type);
      setBackgroundValue(game.background_value ?? "");
      if (game.questions?.length) {
        setQuestions(game.questions.map((q, i) => ({
          id: i + 1,
          question: q.question,
          options: (q.options ?? []).map(o => o.label),
          durationSeconds: q.duration_seconds ?? 20,
          imageUrl: q.image_url ?? "",
          backgroundType: q.background_type ?? "gradient",
          backgroundValue: q.background_value ?? "",
        })));
      }
    }).catch(() => setError("Không thể tải Game để chỉnh sửa."));
  }, [gameId]);

  const current = questions[activeQuestion];
  const canCreate = title.trim().length > 0 && questions.every((q) => q.question.trim() && q.options.filter(Boolean).length >= 2);
  const previewStyle = useMemo(() => ({ background: backgroundValue || "linear-gradient(135deg,#6C2BD9,#2D7FF9)" }), [backgroundValue]);

  function updateQuestion(patch: Partial<DraftQuestion>) { setQuestions((all) => all.map((q, i) => i === activeQuestion ? { ...q, ...patch } : q)); }
  function updateOption(index: number, value: string) { updateQuestion({ options: current.options.map((x, i) => i === index ? value : x) }); }
  function addQuestion() { const id = Math.max(...questions.map((q) => q.id), 0) + 1; setQuestions((all) => [...all, defaultQuestion(id)]); setActiveQuestion(questions.length); }
  function removeQuestion(index: number) { if (questions.length === 1) return; setQuestions((all) => all.filter((_, i) => i !== index)); setActiveQuestion(Math.max(0, Math.min(activeQuestion, questions.length - 2))); }
  function addOption() { if (current.options.length < 8) updateQuestion({ options: [...current.options, ""] }); }
  function removeOption(index: number) { if (current.options.length > 2) updateQuestion({ options: current.options.filter((_, i) => i !== index) }); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canCreate) return setError("Vui lòng nhập tiêu đề, nội dung và ít nhất 2 đáp án cho mọi câu hỏi.");
    setBusy(true); setError(null);
    const input: CreateGameInput = {
      title: title.trim(), coverUrl: coverUrl.trim() || null, backgroundType, backgroundValue: backgroundValue.trim() || null,
      questions: questions.map((q) => ({ question: q.question.trim(), options: q.options.map((x) => x.trim()).filter(Boolean), durationSeconds: q.durationSeconds, imageUrl: q.imageUrl.trim() || null, backgroundType: q.backgroundType, backgroundValue: q.backgroundValue.trim() || null })),
    };
    try {
      const result = gameId ? await api.updateGame(gameId, input) : await api.createGame(input);
      onCreated(result.game.id);
    }
    catch (err) { setError(err instanceof ApiError ? err.message : "Không thể tạo Game."); }
    finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-stage-950 text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-stage-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <button onClick={onBack} className="rounded-xl px-3 py-2 text-sm font-bold text-white/55 hover:bg-white/5 hover:text-white">← My Games</button>
        <div className="hidden text-center md:block"><p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber">GAME BUILDER</p><p className="font-display text-sm font-bold text-white/70">{title || "Untitled Game"}</p></div>
        <button disabled={busy} onClick={submit} className="rounded-xl bg-amber px-4 py-2.5 text-sm font-extrabold text-stage-950 shadow-tile disabled:opacity-50">{busy ? (gameId ? "Đang lưu…" : "Đang tạo…") : (gameId ? "Lưu thay đổi" : "Tạo Game")}</button>
      </div>
    </header>

    <main className="mx-auto grid max-w-[1400px] gap-5 p-4 md:grid-cols-[240px_minmax(0,1fr)_320px] md:p-6">
      <aside className="rounded-[24px] border border-white/10 bg-stage-900 p-3">
        <div className="flex items-center justify-between px-2 py-2"><span className="text-xs font-extrabold uppercase tracking-[0.15em] text-white/40">Questions</span><button onClick={addQuestion} className="grid h-8 w-8 place-items-center rounded-xl bg-white/8 font-bold hover:bg-white/15">＋</button></div>
        <div className="mt-2 space-y-2">
          {questions.map((q, i) => <div key={q.id} className={`group flex items-center gap-2 rounded-2xl p-2 transition ${i === activeQuestion ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"}`}>
            <button onClick={() => setActiveQuestion(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-xs font-extrabold ${i === activeQuestion ? "bg-amber text-stage-950" : "bg-white/8 text-white/55"}`}>{i + 1}</span><span className="truncate text-xs font-semibold text-white/65">{q.question || "Câu hỏi mới"}</span></button>
            {questions.length > 1 && <button onClick={() => removeQuestion(i)} className="px-1 text-xs text-white/20 hover:text-coral">✕</button>}
          </div>)}
        </div>
        <button onClick={addQuestion} className="mt-3 w-full rounded-xl border border-dashed border-white/15 py-3 text-xs font-bold text-white/45 hover:border-white/30 hover:text-white">＋ Thêm câu hỏi</button>
      </aside>

      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7">
          <div className="mb-6"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber">01 · GAME INFO</p><h2 className="mt-2 font-display text-2xl font-extrabold">Thông tin Game</h2></div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="field-label">Tên Game</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Gala Văn Nghệ 2026" className="field-input text-lg font-bold" /></label>
            <label><span className="field-label">Cover image URL <em>(tuỳ chọn)</em></span><input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" className="field-input" /></label>
            <label><span className="field-label">Background</span><select value={backgroundType} onChange={(e) => setBackgroundType(e.target.value as GameBackgroundType)} className="field-input"><option value="gradient">Gradient</option><option value="color">Solid color</option><option value="image">Image URL</option></select></label>
            <label className="md:col-span-2"><span className="field-label">Background value</span><input value={backgroundValue} onChange={(e) => setBackgroundValue(e.target.value)} placeholder={backgroundType === "image" ? "https://…" : "#6C2BD9 hoặc CSS gradient"} className="field-input font-mono text-sm" /></label>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7">
          <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber">02 · QUESTION {activeQuestion + 1}</p><h2 className="mt-2 font-display text-2xl font-extrabold">Nội dung câu hỏi</h2></div><span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/45">{current.durationSeconds}s</span></div>
          <label><span className="field-label">Question</span><textarea value={current.question} onChange={(e) => updateQuestion({ question: e.target.value })} rows={3} placeholder="Nhập câu hỏi…" className="field-input resize-none text-xl font-bold leading-8" /></label>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label><span className="field-label">Question image URL <em>(tuỳ chọn)</em></span><input value={current.imageUrl} onChange={(e) => updateQuestion({ imageUrl: e.target.value })} placeholder="https://…" className="field-input" /></label>
            <label><span className="field-label">Thời gian trả lời</span><select value={current.durationSeconds} onChange={(e) => updateQuestion({ durationSeconds: Number(e.target.value) })} className="field-input"><option value={10}>10 giây</option><option value={20}>20 giây</option><option value={30}>30 giây</option><option value={45}>45 giây</option><option value={60}>60 giây</option><option value={90}>90 giây</option><option value={120}>120 giây</option></select></label>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stage-900 p-5 md:p-7">
          <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber">03 · ANSWERS</p><h2 className="mt-2 font-display text-2xl font-extrabold">Lựa chọn</h2></div><span className="text-xs font-semibold text-white/35">{current.options.filter(Boolean).length}/8</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            {current.options.map((option, i) => <div key={i} className="flex items-center gap-2"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${["bg-coral","bg-sky","bg-emerald","bg-amber"][i % 4]} text-stage-950`}>{String.fromCharCode(65 + i)}</span><input value={option} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} className="field-input" />{current.options.length > 2 && <button type="button" onClick={() => removeOption(i)} className="px-1 text-white/25 hover:text-coral">✕</button>}</div>)}
          </div>
          {current.options.length < 8 && <button type="button" onClick={addOption} className="mt-4 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/50 hover:bg-white/5 hover:text-white">＋ Thêm lựa chọn</button>}
        </section>
        {error && <div className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm font-semibold text-coral">{error}</div>}
      </form>

      <aside className="md:sticky md:top-[82px] md:h-fit">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-stage-900">
          <div className="border-b border-white/10 px-5 py-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/35">Live preview</p></div>
          <div className="p-3"><div className="relative aspect-[4/3] overflow-hidden rounded-[22px] p-5" style={previewStyle}>
            {current.imageUrl && <img src={current.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
            <div className="absolute inset-0 bg-black/15" />
            <div className="relative flex h-full flex-col justify-between"><div className="flex justify-between"><span className="rounded-lg bg-black/20 px-2 py-1 text-[10px] font-bold text-white/80">Q{activeQuestion + 1}</span><span className="rounded-lg bg-black/20 px-2 py-1 font-mono text-[10px] font-bold text-white/80">{current.durationSeconds}s</span></div><p className="font-display text-lg font-extrabold leading-6 text-white drop-shadow-md">{current.question || "Câu hỏi của bạn sẽ hiện ở đây"}</p><div className="grid grid-cols-2 gap-2">{current.options.slice(0,4).map((o,i) => <div key={i} className="rounded-xl bg-white p-2.5 text-[10px] font-extrabold text-stage-950 shadow-lg">{o || `Đáp án ${String.fromCharCode(65+i)}`}</div>)}</div></div>
          </div></div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4"><div className="rounded-xl bg-white/5 p-3"><p className="text-[10px] text-white/35">Câu hỏi</p><p className="mt-1 font-display text-lg font-extrabold">{questions.length}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-[10px] text-white/35">Game PIN</p><p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-amber">AUTO</p></div></div>
        </div>
        <p className="mt-3 px-2 text-[11px] leading-5 text-white/25">Game PIN sẽ được sinh tự động sau khi tạo. Một PIN dùng cho toàn bộ các câu hỏi.</p>
      </aside>
    </main>
  </div>;
}

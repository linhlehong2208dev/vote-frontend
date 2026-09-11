import { useState, type FormEvent } from "react";
import { api, ApiError, type SessionSummary } from "../lib/api";
import { QuestionShareCard } from "../components/QuestionShareCard";

function buildVoteUrl(joinCode: string) {
  return `${window.location.origin}/join/${encodeURIComponent(joinCode)}`;
}

interface CreateQuestionPageProps {
  onCreated: (sessionId: string) => void;
  onCancel?: () => void;
}

export function CreateQuestionPage({
  onCreated,
  onCancel,
}: CreateQuestionPageProps) {
  const [joinCode, setJoinCode] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SessionSummary | null>(null);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }
  function addOption() {
    if (options.length < 8) setOptions((prev) => [...prev, ""]);
  }
  function removeOption(index: number) {
    if (options.length > 2)
      setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!joinCode.trim()) return setError("Vui lòng nhập mã câu hỏi.");
    if (!/^[A-Za-z0-9]{3,8}$/.test(joinCode.trim())) {
      return setError("Mã câu hỏi phải có 3-8 ký tự chữ hoặc số.");
    }
    if (!question.trim()) return setError("Vui lòng nhập câu hỏi.");
    if (cleanOptions.length < 2) return setError("Cần tối thiểu 2 lựa chọn.");

    setBusy(true);
    setError(null);
    try {
      const { session } = await api.createSession(
        question.trim(),
        cleanOptions,
        joinCode.trim().toUpperCase(),
      );
      setCreated(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo câu hỏi thất bại.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const url = buildVoteUrl(created.join_code ?? "");
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 py-10">
        <p className="font-display text-lg font-semibold text-emerald">
          Đã tạo câu hỏi!
        </p>
        <QuestionShareCard url={url} question={created.question} code={created.join_code} />
        <div className="flex w-full gap-3">
          <button
            onClick={() => onCreated(created.id)}
            className="flex-1 rounded-xl bg-amber py-3 font-display font-semibold text-stage-900 shadow-tile
              transition-all active:translate-y-1 active:shadow-tile-active"
          >
            Vào bảng điều khiển
          </button>
          <button
            onClick={() => {
              setCreated(null);
              setJoinCode("");
              setQuestion("");
              setOptions(["", ""]);
            }}
            className="flex-1 rounded-xl border border-stage-700 py-3 font-display font-semibold text-ink-900
              transition-all active:translate-y-1"
          >
            Tạo câu hỏi khác
          </button>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-ink-500 underline underline-offset-2"
          >
            ← Về danh sách câu hỏi
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 self-start text-sm text-ink-500 underline underline-offset-2"
        >
          ← Quay lại danh sách
        </button>
      )}

      <h1 className="font-display text-2xl font-bold text-ink-900">
        Tạo câu hỏi mới
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-ink-700">
          Mã câu hỏi
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase())}
            placeholder="VN01"
            maxLength={8}
            autoCapitalize="characters"
            className="rounded-xl border border-stage-700 bg-stage-800 px-4 py-3 font-mono font-semibold tracking-widest text-ink-900
              placeholder:text-ink-300 focus:border-amber focus:outline-none"
          />
          <span className="text-xs text-ink-300">3-8 ký tự chữ hoặc số. User sẽ vào bằng link /join/VN01.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-ink-700">
          Câu hỏi
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Tiết mục nào hay nhất?"
            className="rounded-xl border border-stage-700 bg-stage-800 px-4 py-3 text-ink-900
              placeholder:text-ink-300 focus:border-amber focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-700">Lựa chọn (tối thiểu 2)</span>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Lựa chọn ${i + 1}`}
                className="flex-1 rounded-xl border border-stage-700 bg-stage-800 px-4 py-2.5 text-ink-900
                  placeholder:text-ink-300 focus:border-amber focus:outline-none"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded-xl px-3 text-ink-500 hover:text-coral"
                  aria-label="Xóa lựa chọn"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-1 self-start text-sm text-amber underline underline-offset-2"
            >
              + Thêm lựa chọn
            </button>
          )}
        </div>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-xl bg-amber py-3 font-display font-semibold text-stage-900 shadow-tile
            transition-all active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
        >
          {busy ? "Đang tạo..." : "Tạo câu hỏi & lấy link/QR"}
        </button>
      </form>
    </div>
  );
}

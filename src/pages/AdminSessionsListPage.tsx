import { useEffect, useState } from "react";
import { api, type SessionSummary } from "../lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chá» báº¯t Ä‘áº§u",
  active: "Äang má»Ÿ",
  paused: "Táº¡m dá»«ng",
  closed: "ÄÃ£ chá»‘t",
};

export function AdminSessionsListPage({
  onSelect,
  onCreateNew,
}: {
  onSelect: (sessionId: string) => void;
  onCreateNew: () => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    api
      .listSessions()
      .then((r) => setSessions(r.sessions))
      .catch(() => setSessions([]));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Danh sÃ¡ch cÃ¢u há»i
        </h1>
        <button
          onClick={onCreateNew}
          className="rounded-xl bg-amber px-4 py-2 font-display text-sm font-semibold text-stage-900 shadow-tile"
        >
          + Táº¡o má»›i
        </button>
      </div>

      {sessions === null && <p className="text-ink-500">Äang táº£i...</p>}
      {sessions?.length === 0 && (
        <p className="text-ink-500">ChÆ°a cÃ³ cÃ¢u há»i nÃ o.</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="rounded-xl bg-stage-800 p-4 text-left transition-colors hover:bg-stage-700"
          >
            <p className="font-display font-semibold text-ink-900 line-clamp-1">
              {s.question}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              MÃ£ <span className="font-mono font-semibold text-amber">{s.join_code ?? "â€”"}</span> Â·{" "}
              {STATUS_LABELS[s.status] ?? s.status} Â·{" "}
              {new Date(s.created_at).toLocaleString("vi-VN")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}


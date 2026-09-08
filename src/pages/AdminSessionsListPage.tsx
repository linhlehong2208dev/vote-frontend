import { useEffect, useState } from "react";
import { api, type SessionSummary } from "../lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ bắt đầu",
  active: "Đang mở",
  paused: "Tạm dừng",
  closed: "Đã chốt",
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
        <h1 className="font-display text-2xl font-bold text-white">
          Danh sách câu hỏi
        </h1>
        <button
          onClick={onCreateNew}
          className="rounded-xl bg-amber px-4 py-2 font-display text-sm font-semibold text-stage-900 shadow-tile"
        >
          + Tạo mới
        </button>
      </div>

      {sessions === null && <p className="text-white/50">Đang tải...</p>}
      {sessions?.length === 0 && (
        <p className="text-white/50">Chưa có câu hỏi nào.</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="rounded-xl bg-stage-800 p-4 text-left transition-colors hover:bg-stage-700"
          >
            <p className="font-display font-semibold text-white line-clamp-1">
              {s.question}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {STATUS_LABELS[s.status] ?? s.status} ·{" "}
              {new Date(s.created_at).toLocaleString("vi-VN")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

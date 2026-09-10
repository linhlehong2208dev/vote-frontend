import { supabase } from "./supabaseClient";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

export type SessionStatus = "pending" | "active" | "paused" | "closed";

export interface OptionInfo {
  id: string;
  label: string;
  sort_order: number;
}

export interface SessionInfo {
  id: string;
  question: string;
  status: SessionStatus;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  remaining_seconds: number | null;
  paused_at: string | null;
  join_code: string | null;
  options: OptionInfo[];
}

export interface SessionSummary {
  id: string;
  question: string;
  status: SessionStatus;
  join_code: string | null;
  created_at: string;
}


export interface LiveStats {
  joinedCount: number;
  votedCount: number;
  waitingCount: number;
  optionCounts: Record<string, number>;
}

export interface ResultsInfo {
  ranking: { optionId: string; label: string; votes: number }[];
  noAnswerCount: number;
  totalParticipants: number;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.error ?? "unknown_error",
      body.message ?? "Đã có lỗi xảy ra.",
      res.status,
    );
  }

  return body as T;
}

export const api = {
  join: (sessionId: string) =>
    request<{ ok: true; alreadyJoined: boolean }>("/api/join", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  select: (sessionId: string, optionId: string | null) =>
    request<{ ok: true }>("/api/select", {
      method: "POST",
      body: JSON.stringify({ sessionId, optionId }),
    }),

  selectionCount: (sessionId: string) =>
    request<{ count: number }>(`/api/select/count/${sessionId}`),

  joinedCount: (sessionId: string) =>
    request<{ count: number }>(`/api/session/${sessionId}/joined-count`),

  getSession: (sessionId: string) =>
    request<SessionInfo>(`/api/session/${sessionId}`),

  getSessionByCode: (code: string) =>
    request<{ session: { id: string; question: string; status: SessionStatus; join_code: string } }>(
      `/api/session/code/${encodeURIComponent(code.trim().toUpperCase())}`,
    ),

  // Tạo câu hỏi mới (admin only). Trả về session vừa tạo (status='pending')
  // kèm id để FE tự build link/QR chia sẻ, không cần gọi lại getSession.
  createSession: (question: string, options: string[], joinCode?: string) =>
    request<{ ok: true; session: SessionSummary }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ question, options, joinCode }),
    }),

  getLiveStats: (sessionId: string) =>
    request<LiveStats>(`/api/session/${sessionId}/live-stats`),

  // Danh sách toàn bộ câu hỏi đã tạo (admin only) - phục vụ trang quản lý.
  listSessions: () => request<{ sessions: SessionSummary[] }>("/api/sessions"),

  startSession: (sessionId: string, durationSeconds: number) =>
    request<{ ok: true }>(`/api/session/${sessionId}/start`, {
      method: "POST",
      body: JSON.stringify({ durationSeconds }),
    }),

  pauseSession: (sessionId: string) =>
    request<{ ok: true; remainingSeconds: number }>(
      `/api/session/${sessionId}/pause`,
      {
        method: "POST",
      },
    ),

  resumeSession: (sessionId: string) =>
    request<{ ok: true; remainingSeconds: number }>(
      `/api/session/${sessionId}/resume`,
      {
        method: "POST",
      },
    ),

  closeSession: (sessionId: string) =>
    request<{ ok: true }>(`/api/session/${sessionId}/close`, {
      method: "POST",
    }),

  getResults: (sessionId: string) =>
    request<ResultsInfo>(`/api/results/${sessionId}`),
};

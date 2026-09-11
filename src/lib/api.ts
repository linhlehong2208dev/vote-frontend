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


export type GameStatus = "draft" | "lobby" | "active" | "closed";
export type GameBackgroundType = "color" | "gradient" | "image";

export interface GameQuestion {
  id: string;
  question: string;
  status: SessionStatus;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  remaining_seconds: number | null;
  paused_at: string | null;
  game_id: string;
  sort_order: number;
  background_type: GameBackgroundType | null;
  background_value: string | null;
  image_url: string | null;
  options?: OptionInfo[];
}

export interface GameParticipant {
  id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  last_seen_at?: string | null;
}

export interface GameInfo {
  id: string;
  title: string;
  pin: string;
  status: GameStatus;
  cover_url: string | null;
  background_type: GameBackgroundType;
  background_value: string | null;
  current_session_id: string | null;
  created_at: string;
  updated_at?: string;
  questions?: GameQuestion[];
}

export interface CreateGameQuestionInput {
  question: string;
  options: string[];
  durationSeconds?: number | null;
  imageUrl?: string | null;
  backgroundType?: GameBackgroundType;
  backgroundValue?: string | null;
}

export interface CreateGameInput {
  title: string;
  pin?: string;
  coverUrl?: string | null;
  backgroundType?: GameBackgroundType;
  backgroundValue?: string | null;
  questions: CreateGameQuestionInput[];
}

export interface GameQuestionDashboard {
  id: string;
  number: number;
  question: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  totalVotes: number;
  noAnswerCount: number;
  ranking: { optionId: string; label: string; votes: number }[];
  history: { userId: string; displayName: string; optionId: string | null; label?: string | null; timestamp: string | null }[];
}

export interface GamePublicResults {
  game: { id: string; title: string; pin: string; status: GameStatus };
  participantCount: number;
  totalVotes: number;
  questions: Array<{
    questionId: string;
    questionNumber: number;
    question: string;
    status: SessionStatus;
    startedAt: string | null;
    endedAt: string | null;
    totalVotes: number;
    noAnswerCount: number;
    ranking: { optionId: string; label: string; votes: number }[];
  }>;
}

export interface GameDashboard {
  game: GameInfo;
  participantCount: number;
  totalVotes: number;
  participants: GameParticipant[];
  questions: GameQuestionDashboard[];
  voteHistory: { questionId: string; questionNumber: number; displayName: string; userId: string; optionId: string | null; label?: string | null; timestamp: string | null }[];
  participantJoinTimestamps: { userId: string; displayName: string; joinedAt: string }[];
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
  updateGame: (gameId: string, input: CreateGameInput) =>
    request<{ ok: true; game: GameInfo }>(`/api/games/${gameId}`, { method: "PUT", body: JSON.stringify(input) }),

  createGame: (input: CreateGameInput) =>
    request<{ ok: true; game: GameInfo }>("/api/games", {
      method: "POST", body: JSON.stringify(input),
    }),

  listGames: () => request<{ games: GameInfo[] }>("/api/games"),

  getGame: (gameId: string) =>
    request<{ game: GameInfo }>(`/api/games/${gameId}`),

  getGameByPin: (pin: string) =>
    request<{ game: GameInfo }>(`/api/games/pin/${encodeURIComponent(pin.trim().toUpperCase())}`),

  joinGame: (gameId: string, displayName: string) =>
    request<{ ok: true }>(`/api/games/${gameId}/join`, {
      method: "POST", body: JSON.stringify({ displayName }),
    }),

  getGameParticipantCount: (gameId: string) =>
    request<{ count: number }>(`/api/games/${gameId}/participants/count`),

  getGameParticipants: (gameId: string) =>
    request<{ participants: GameParticipant[] }>(`/api/games/${gameId}/participants`),

  enterGameLobby: (gameId: string) =>
    request<{ ok: true; game: GameInfo }>(`/api/games/${gameId}/lobby`, { method: "POST" }),

  startGame: (gameId: string) =>
    request<{ ok: true; game: GameInfo }>(`/api/games/${gameId}/start`, { method: "POST" }),

  nextGameQuestion: (gameId: string) =>
    request<{ ok: true; game: GameInfo }>(`/api/games/${gameId}/next`, { method: "POST" }),

  closeGame: (gameId: string) =>
    request<{ ok: true; game: GameInfo }>(`/api/games/${gameId}/close`, { method: "POST" }),

  getGameDashboard: (gameId: string) =>
    request<GameDashboard>(`/api/games/${gameId}/dashboard`),

  getGamePublicResults: (gameId: string) =>
    request<GamePublicResults>(`/api/games/${gameId}/results`),

  getGameLiveStats: (gameId: string) =>
    request<LiveStats & { participantCount: number; currentSessionId?: string }>(
      `/api/games/${gameId}/stats`,
    ),

  getQuestionVoters: (gameId: string, questionId: string, optionId?: string) =>
    request<{ voters: { userId: string; displayName: string; optionId: string | null }[] }>(
      `/api/games/${gameId}/questions/${questionId}/voters${optionId ? `?optionId=${encodeURIComponent(optionId)}` : ""}`,
    ),

};

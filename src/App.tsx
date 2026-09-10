import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { VotePage } from "./pages/VotePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminSessionsListPage } from "./pages/AdminSessionsListPage";
import { CreateQuestionPage } from "./pages/CreateQuestionPage";
import { UserProfileBar } from "./components/UserProfileBar";
import { isAdminEmail } from "./lib/isAdminEmail";
import { api } from "./lib/api";

function getSessionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("session");
}

function getJoinCodeFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/join\/([^/]+)\/?$/i);
  return match ? decodeURIComponent(match[1]).trim().toUpperCase() : null;
}

type AdminView = "list" | "create";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualJoinCode, setManualJoinCode] = useState<string | null>(null);
  const [resolvedJoinSessionId, setResolvedJoinSessionId] = useState<string | null>(null);
  const [joinResolving, setJoinResolving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("list");

  const urlSessionId = getSessionIdFromUrl();
  const joinCode = getJoinCodeFromUrl() ?? manualJoinCode;

  // Google OAuth hiện quay về origin. Khôi phục đúng URL /join/<code> đã lưu trước khi đăng nhập.
  useEffect(() => {
    if (loading || !session) return;
    const pendingPath = sessionStorage.getItem("vote_auth_return_path");
    if (!pendingPath || !pendingPath.startsWith("/")) return;
    sessionStorage.removeItem("vote_auth_return_path");
    if (pendingPath !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState({}, "", pendingPath);
      window.location.reload();
    }
  }, [loading, session]);

  // Link /join/VN01 -> resolve code thành UUID, sau đó dùng toàn bộ flow Vote/Admin hiện có.
  useEffect(() => {
    if (!session || !joinCode || urlSessionId || manualSessionId) return;
    let cancelled = false;
    setJoinResolving(true);
    setJoinError(null);
    api.getSessionByCode(joinCode)
      .then(({ session: found }) => {
        if (!cancelled) setResolvedJoinSessionId(found.id);
      })
      .catch((err) => {
        if (!cancelled) setJoinError(err.message ?? "Mã câu hỏi không hợp lệ.");
      })
      .finally(() => {
        if (!cancelled) setJoinResolving(false);
      });
    return () => { cancelled = true; };
  }, [session, joinCode, urlSessionId]);

  const sessionId = urlSessionId ?? resolvedJoinSessionId ?? (manualSessionId.trim() || null);
  // Xác định quyền admin dựa vào EMAIL đăng nhập (khớp VITE_ADMIN_EMAILS),
  // không còn phụ thuộc vào việc gõ đúng path /admin trên URL.
  const isAdmin = isAdminEmail(profile?.email);

  if (loading) {
    return <FullScreenMessage text="Đang tải..." />;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (joinCode && !sessionId) {
    if (joinResolving) return <FullScreenMessage text={`Đang mở phòng ${joinCode}...`} />;
    return <FullScreenMessage text={joinError ?? "Không tìm thấy phòng."} />;
  }

  // Admin chưa chọn câu hỏi cụ thể (không có ?session= trên URL) -> mặc định
  // vào thẳng danh sách câu hỏi + nút tạo mới, không cần vào /admin thủ công.
  if (isAdmin && !sessionId) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <UserProfileBar />
        <div className="mt-6">
          {adminView === "create" ? (
            <CreateQuestionPage
              onCreated={(id) => setManualSessionId(id)}
              onCancel={() => setAdminView("list")}
            />
          ) : (
            <AdminSessionsListPage
              onSelect={(id) => setManualSessionId(id)}
              onCreateNew={() => setAdminView("create")}
            />
          )}
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <SessionIdGate
        onSubmit={(value) => {
          const trimmed = value.trim();
          if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(trimmed)) {
            setManualSessionId(trimmed);
          } else {
            setManualJoinCode(trimmed.toUpperCase());
          }
        }}
      />
    );
  }

  return isAdmin ? (
    <AdminPage sessionId={sessionId} />
  ) : (
    <VotePage sessionId={sessionId} />
  );
}

function SessionIdGate({ onSubmit }: { onSubmit: (id: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-full max-w-xs">
        <UserProfileBar />
      </div>

      <div>
        <p className="font-display text-lg font-semibold text-white">
          Nhập mã câu hỏi
        </p>
        <p className="mt-2 max-w-xs text-sm text-white/50">
          MC sẽ chia sẻ link hoặc mã câu hỏi. Bạn chỉ cần nhập mã ngắn, ví dụ
          <code className="text-white/70"> VN01</code>. Link cũ dạng
          <code className="text-white/70"> ?session=&lt;id&gt;</code> vẫn được hỗ trợ.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="mã câu hỏi"
          className="rounded-xl border border-white/10 bg-stage-800 px-4 py-3 text-white
            placeholder:text-white/30 focus:border-amber focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-amber py-3 font-display font-semibold text-stage-900
            shadow-tile transition-all active:translate-y-1 active:shadow-tile-active"
        >
          Vào phòng
        </button>
      </form>
    </div>
  );
}

function FullScreenMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-white/60">{text}</p>
    </div>
  );
}

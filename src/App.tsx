import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { VotePage } from "./pages/VotePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminSessionsListPage } from "./pages/AdminSessionsListPage";
import { CreateQuestionPage } from "./pages/CreateQuestionPage";
import { UserProfileBar } from "./components/UserProfileBar";
import { isAdminEmail } from "./lib/isAdminEmail";

function getSessionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("session");
}

type AdminView = "list" | "create";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [manualSessionId, setManualSessionId] = useState("");
  const [adminView, setAdminView] = useState<AdminView>("list");

  const urlSessionId = getSessionIdFromUrl();
  const sessionId = urlSessionId ?? (manualSessionId.trim() || null);
  // Xác định quyền admin dựa vào EMAIL đăng nhập (khớp VITE_ADMIN_EMAILS),
  // không còn phụ thuộc vào việc gõ đúng path /admin trên URL.
  const isAdmin = isAdminEmail(profile?.email);

  if (loading) {
    return <FullScreenMessage text="Đang tải..." />;
  }

  if (!session) {
    return <LoginPage />;
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
    return <SessionIdGate onSubmit={(id) => setManualSessionId(id)} />;
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
          MC sẽ chia sẻ link hoặc mã câu hỏi. Bạn cũng có thể vào trực tiếp qua
          link dạng <code className="text-white/70">?session=&lt;id&gt;</code>.
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

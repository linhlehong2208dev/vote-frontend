import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { VotePage } from "./pages/VotePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminSessionsListPage } from "./pages/AdminSessionsListPage";
import { CreateQuestionPage } from "./pages/CreateQuestionPage";

function getSessionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("session");
}

function isAdminRoute(): boolean {
  return window.location.pathname.replace(/\/+$/, "") === "/admin";
}

type AdminView = "list" | "create";

export default function App() {
  const { session, loading } = useAuth();
  const [manualSessionId, setManualSessionId] = useState("");
  const [adminView, setAdminView] = useState<AdminView>("list");

  const isAdmin = isAdminRoute();
  const urlSessionId = getSessionIdFromUrl();
  const sessionId = urlSessionId ?? (manualSessionId.trim() || null);

  if (loading) {
    return <FullScreenMessage text="Đang tải..." />;
  }

  if (!session) {
    return <LoginPage />;
  }

  // Admin vào /admin mà chưa chọn session cụ thể (không có ?session= trên URL
  // và chưa tự nhập/tạo) -> hiển thị danh sách câu hỏi + nút tạo mới, thay vì
  // ô "nhập session id" chung dùng cho user thường.
  if (isAdmin && !sessionId) {
    return adminView === "create" ? (
      <CreateQuestionPage
        onCreated={(id) => setManualSessionId(id)}
        onCancel={() => setAdminView("list")}
      />
    ) : (
      <AdminSessionsListPage
        onSelect={(id) => setManualSessionId(id)}
        onCreateNew={() => setAdminView("create")}
      />
    );
  }

  if (!sessionId) {
    return (
      <SessionIdGate
        onSubmit={(id) => setManualSessionId(id)}
        isAdmin={isAdmin}
      />
    );
  }

  return isAdmin ? (
    <AdminPage sessionId={sessionId} />
  ) : (
    <VotePage sessionId={sessionId} />
  );
}

function SessionIdGate({
  onSubmit,
  isAdmin,
}: {
  onSubmit: (id: string) => void;
  isAdmin: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-white">
        {isAdmin
          ? "Nhập mã phiên bình chọn để điều khiển"
          : "Nhập mã phiên bình chọn"}
      </p>
      <p className="mt-2 max-w-xs text-sm text-white/50">
        MC sẽ chia sẻ link hoặc mã phiên. Bạn cũng có thể vào trực tiếp qua link
        dạng <code className="text-white/70">?session=&lt;id&gt;</code>.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        className="mt-6 flex w-full max-w-xs flex-col gap-3"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="session id"
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

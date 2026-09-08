import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGoogleLogin() {
    setBusy(true);
    setErrorMsg("");
    try {
      await signInWithGoogle();
      // Sau bước này trình duyệt sẽ redirect sang Google -> không cần setBusy(false)
      // ở nhánh thành công, component sẽ unmount khi redirect xảy ra.
    } catch (err: any) {
      setErrorMsg(err.message ?? "Đăng nhập thất bại.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-3xl font-bold text-white">
          Bình chọn văn nghệ
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Đăng nhập bằng tài khoản Google công ty để tham gia bình chọn.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3
            font-display font-semibold text-stage-900 shadow-tile transition-all
            active:translate-y-1 active:shadow-tile-active disabled:opacity-50"
        >
          <GoogleIcon />
          {busy ? "Đang chuyển hướng..." : "Đăng nhập bằng Google"}
        </button>

        {errorMsg && <p className="mt-4 text-sm text-coral">{errorMsg}</p>}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

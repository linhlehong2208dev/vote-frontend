import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

const ALLOWED_DOMAIN_HINT = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN as
  | string
  | undefined;

export interface UserProfile {
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toProfile(session: Session | null): UserProfile | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  return {
    email: session.user.email ?? "",
    // Google trả về 'full_name' (đôi khi 'name'), dùng email làm fallback cuối cùng.
    fullName:
      (meta.full_name as string) ||
      (meta.name as string) ||
      session.user.email ||
      "Người dùng",
    avatarUrl:
      (meta.avatar_url as string) || (meta.picture as string) || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    // Giữ lại URL phòng hiện tại để sau khi Google OAuth quay về root,
    // App có thể đưa user trở lại đúng /join/VN01.
    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (returnPath.startsWith("/join/") || window.location.search.includes("session=")) {
      sessionStorage.setItem("vote_auth_return_path", returnPath);
    } else {
      sessionStorage.removeItem("vote_auth_return_path");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Giữ origin để không phải khai báo từng /join/<code> trong Supabase Redirect URLs.
        redirectTo: window.location.origin,
        ...(ALLOWED_DOMAIN_HINT
          ? { queryParams: { hd: ALLOWED_DOMAIN_HINT } }
          : {}),
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const profile = toProfile(session);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}

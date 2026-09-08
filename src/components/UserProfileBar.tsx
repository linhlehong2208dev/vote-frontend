import { useAuth } from "../hooks/useAuth";

export function UserProfileBar() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-stage-800 px-4 py-3">
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber font-display font-bold text-stage-900">
          {initials || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-display text-sm font-semibold text-white">
          Xin chào, {profile.fullName}
        </p>
        <p className="truncate text-xs text-white/50">{profile.email}</p>
      </div>
      <button
        onClick={signOut}
        className="shrink-0 text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
      >
        Đăng xuất
      </button>
    </div>
  );
}

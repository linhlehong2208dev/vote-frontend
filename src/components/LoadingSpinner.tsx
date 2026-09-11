// src/components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  variant?: "ring" | "dots";
  size?: "sm" | "md" | "lg";
  label?: string;
  fullScreen?: boolean;
}

const SIZE_MAP: Record<NonNullable<LoadingSpinnerProps["size"]>, number> = {
  sm: 24,
  md: 40,
  lg: 64,
};

export function LoadingSpinner({
  variant = "ring",
  size = "md",
  label,
  fullScreen,
}: LoadingSpinnerProps) {
  const px = SIZE_MAP[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {variant === "ring" ? (
        <div
          className="animate-spin rounded-full border-4 border-stage-700 border-t-amber"
          style={{ width: px, height: px }}
          role="status"
          aria-label={label ?? "Đang tải"}
        />
      ) : (
        <div
          className="flex items-center gap-1.5"
          role="status"
          aria-label={label ?? "Đang tải"}
        >
          <span className="h-2.5 w-2.5 animate-dotBounce rounded-full bg-amber [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 animate-dotBounce rounded-full bg-amber [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 animate-dotBounce rounded-full bg-amber" />
        </div>
      )}
      {label && <p className="text-sm font-semibold text-ink-500">{label}</p>}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stage-950 px-6 animate-pageIn">
      {content}
    </div>
  );
}

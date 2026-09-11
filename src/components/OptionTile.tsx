// src/components/OptionTile.tsx
type TileColor = "coral" | "sky" | "amber" | "emerald";

const COLOR_MAP: Record<TileColor, string> = {
  coral: "bg-coral text-white",
  sky: "bg-sky text-white",
  amber: "bg-amber text-white",
  emerald: "bg-emerald text-white",
};

const SHAPES: Record<TileColor, JSX.Element> = {
  coral: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
      <path d="M12 3 L21 20 L3 20 Z" />
    </svg>
  ),
  sky: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" />
    </svg>
  ),
  amber: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  emerald: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
};

const ORDER: TileColor[] = ["coral", "sky", "amber", "emerald"];

interface OptionTileProps {
  index: number;
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function OptionTile({
  index,
  label,
  selected,
  disabled,
  onSelect,
}: OptionTileProps) {
  const color = ORDER[index % ORDER.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        group flex min-h-[84px] w-full items-center gap-3 rounded-2xl px-5 py-4 text-left
        font-display text-lg font-semibold leading-snug
        shadow-tile transition-all duration-150
        active:translate-y-1 active:shadow-tile-active
        disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0
        ${COLOR_MAP[color]}
        ${selected ? "ring-4 ring-amber ring-offset-2 ring-offset-stage-900" : ""}
      `}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
        {SHAPES[color]}
      </span>
      <span className="text-white">{label}</span>
    </button>
  );
}

interface OptionTileProps {
  index: number;
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function OptionTile({ index, label, selected, disabled, onSelect }: OptionTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        group flex min-h-[84px] w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left
        font-display text-lg font-semibold leading-snug shadow-tile transition-all duration-200
        active:scale-[.985] active:shadow-tile-active disabled:cursor-not-allowed disabled:opacity-50
        ${selected
          ? "border-amber bg-white text-stage-950 shadow-[0_0_0_4px_rgba(255,182,39,.18),0_18px_45px_rgba(0,0,0,.25)] animate-[selectionPop_.28s_ease-out]"
          : "border-white/10 bg-white/[.06] text-white hover:bg-white/[.09]"}
      `}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black transition ${selected ? "bg-stage-950 text-amber" : "bg-white/10 text-white/55"}`}>
        {String.fromCharCode(65 + index)}
      </span>
      <span className={selected ? "text-stage-950" : "text-white/90"}>{label}</span>
      {selected && <span className="ml-auto text-xs font-black uppercase tracking-[.12em] text-stage-950/60">Đã chọn</span>}
    </button>
  );
}

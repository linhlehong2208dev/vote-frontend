// src/components/CountdownRing.tsx
interface CountdownRingProps {
  seconds: number;
  totalSeconds: number;
  paused?: boolean;
  size?: number;
}

export function CountdownRing({
  seconds,
  totalSeconds,
  paused,
  size = 176,
}: CountdownRingProps) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const fraction =
    totalSeconds > 0 ? Math.min(1, Math.max(0, seconds / totalSeconds)) : 0;
  const offset = circumference * (1 - fraction);
  const urgent = seconds <= 5 && seconds > 0 && !paused;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="timer"
      aria-live="polite"
      aria-label={`Còn ${seconds} giây`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(22,22,22,0.10)"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={paused ? "#1C1C1E" : urgent ? "#FF3B30" : "#E4002B"}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={`font-display text-4xl font-bold tabular-nums ${
            urgent ? "text-coral animate-pulseSlow" : "text-ink-900"
          }`}
        >
          {seconds}
        </span>
        {paused && (
          <span className="mt-0.5 text-[11px] font-medium text-sky">
            tạm dừng
          </span>
        )}
      </div>
    </div>
  );
}

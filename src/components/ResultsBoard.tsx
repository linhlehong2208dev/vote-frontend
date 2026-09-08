import { useEffect, useState } from 'react';
import type { ResultsInfo } from '../lib/api';

const BAR_COLORS = ['#FFB627', '#4C9AFF', '#FF5D5D', '#3DDC97'];

export function ResultsBoard({ results }: { results: ResultsInfo }) {
  const [revealed, setRevealed] = useState(false);
  const maxVotes = Math.max(1, ...results.ranking.map((r) => r.votes));

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [results]);

  return (
    <div className="w-full max-w-md">
      <p className="mb-4 text-center font-body text-sm text-white/60">
        {results.totalParticipants} người tham gia · {results.noAnswerCount} bỏ trống
      </p>
      <div className="flex flex-col gap-3">
        {results.ranking.map((row, i) => {
          const pct = (row.votes / maxVotes) * 100;
          return (
            <div
              key={row.optionId}
              className="animate-popIn rounded-xl bg-stage-800 p-3"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-base font-semibold text-white">
                  {i === 0 && <span aria-hidden>🏆</span>}
                  {row.label}
                </span>
                <span className="font-display text-sm font-bold tabular-nums text-white/80">
                  {row.votes} phiếu
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-black/25">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: revealed ? `${pct}%` : 0,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

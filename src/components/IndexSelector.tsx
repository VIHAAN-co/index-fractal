import React from 'react';
import { IndexKey, INDICES } from '@/lib/types';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface IndexSelectorProps {
  selected: IndexKey;
  onSelect: (key: IndexKey) => void;
  currentPrice?: number;
  change1d?: number;
  change1dPct?: number;
  isLoading: boolean;
}

export const IndexSelector: React.FC<IndexSelectorProps> = ({
  selected,
  onSelect,
  currentPrice,
  change1d,
  change1dPct,
  isLoading,
}) => {
  const indices: IndexKey[] = ['^NSEI', '^NSEBANK', '^BSESN'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {indices.map((key) => {
        const info = INDICES[key];
        const isSelected = selected === key;
        const isCurrentActive = isSelected && currentPrice !== undefined;
        const isPositive = (change1dPct ?? 0) >= 0;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`p-4 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
              isSelected
                ? 'bg-zinc-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                : 'bg-zinc-950/60 hover:bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            {isSelected && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            )}

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className={`h-4 w-4 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span className={`text-base font-bold tracking-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                  {info.name}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {info.tag}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              {isCurrentActive ? (
                <>
                  <div className="text-xl font-mono font-extrabold text-white">
                    ₹{currentPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                      isPositive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}
                      {change1dPct}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500 italic">
                  {isSelected && isLoading ? 'Analyzing data...' : 'Click to analyze'}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

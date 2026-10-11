import React from 'react';
import { AnalogMatch } from '@/lib/types';
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalogsListProps {
  matches: AnalogMatch[];
}

export const AnalogsList: React.FC<AnalogsListProps> = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 text-center text-zinc-500 font-mono text-xs">
        No matching historical analogs found in the 5-year dataset for this window.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
        <History className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
          Top 5-Year Historical Analogs & Outturn
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {matches.map((match, idx) => {
          const isGreen = match.forward5dReturn >= 0;

          return (
            <div
              key={match.id}
              className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 flex flex-col justify-between hover:border-zinc-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Analog #{idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {match.similarityScore}% Match
                  </span>
                </div>

                <div className="text-xs font-mono text-zinc-400 mb-3">
                  <div className="text-[11px] text-zinc-500">Historical Window:</div>
                  <div className="font-semibold text-zinc-200">
                    {match.startDate} → {match.endDate}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Next 5 Days:</span>
                  <div className={`flex items-center gap-0.5 font-bold ${isGreen ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGreen ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{isGreen ? '+' : ''}{match.forward5dReturn}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Next 10 Days:</span>
                  <span className={`font-semibold ${match.forward10dReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {match.forward10dReturn >= 0 ? '+' : ''}{match.forward10dReturn}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400">
                  <span>Swing Peak / Dip:</span>
                  <span className="font-semibold">
                    <span className="text-emerald-400">+{match.maxUpside5d}%</span> / <span className="text-rose-400">{match.maxDrawdown5d}%</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

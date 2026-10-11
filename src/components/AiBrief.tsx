import React from 'react';
import { AnalysisResult } from '@/lib/types';
import { Sparkles, Compass, AlertCircle } from 'lucide-react';

interface AiBriefProps {
  summary: AnalysisResult['summary'];
  bias: AnalysisResult['statistics']['overallBias'];
}

export const AiBrief: React.FC<AiBriefProps> = ({ summary, bias }) => {
  const isBullish = bias === 'BULLISH';
  const isBearish = bias === 'BEARISH';

  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-5">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
            Quantitative Fractal Intelligence Brief
          </h3>
        </div>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
            isBullish
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : isBearish
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {bias} BIAS
        </span>
      </div>

      <div className="space-y-3 font-mono">
        <div>
          <h4 className="text-base font-bold text-zinc-100 mb-1">{summary.headline}</h4>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">{summary.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mb-1">
              <Compass className="h-3.5 w-3.5" />
              <span>Historical Context</span>
            </div>
            <p className="text-xs text-zinc-400 leading-normal font-sans">
              {summary.historicalContext}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Tactical Risk Note</span>
            </div>
            <p className="text-xs text-zinc-400 leading-normal font-sans">
              {summary.actionableNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AnalysisResult } from '@/lib/types';
import { Target, TrendingUp, TrendingDown, Percent, ShieldAlert } from 'lucide-react';

interface MetricCardsProps {
  data: AnalysisResult;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ data }) => {
  const { statistics } = data;
  const isBullish = statistics.overallBias === 'BULLISH';
  const isBearish = statistics.overallBias === 'BEARISH';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 5-Day Win Rate */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
          <span>5-Day Win Rate</span>
          <Target className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-1">
            <span
              className={
                statistics.winRate5d >= 60
                  ? 'text-emerald-400'
                  : statistics.winRate5d <= 40
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {statistics.winRate5d}%
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Probability of higher close in 5 sessions
          </p>
        </div>
      </div>

      {/* Expected 5-Day Return */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
          <span>Expected 5-Day Move</span>
          {statistics.avgReturn5d >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-400" />
          )}
        </div>
        <div>
          <div
            className={`text-3xl font-extrabold font-mono tracking-tight ${
              statistics.avgReturn5d >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {statistics.avgReturn5d > 0 ? '+' : ''}
            {statistics.avgReturn5d}%
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Average forward trajectory of top matches
          </p>
        </div>
      </div>

      {/* Bias / Signal */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
          <span>Historical Bias</span>
          <Percent className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-black font-mono px-2.5 py-1 rounded border ${
                isBullish
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isBearish
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {statistics.overallBias}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Based on {data.matches.length} closest 5-year fractals
          </p>
        </div>
      </div>

      {/* Risk / Reward Box */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
          <span>Max Upside / Drawdown</span>
          <ShieldAlert className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-3 text-lg font-mono font-bold">
            <span className="text-emerald-400">+{statistics.maxUpside5d}%</span>
            <span className="text-zinc-600">/</span>
            <span className="text-rose-400">{statistics.maxDrawdown5d}%</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Extreme price swing limits within 5 days
          </p>
        </div>
      </div>
    </div>
  );
};

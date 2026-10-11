import React from 'react';
import { Shield, Activity, RefreshCw } from 'lucide-react';

interface HeaderProps {
  lastUpdated?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lastUpdated, isRefreshing, onRefresh }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">IndexFractal</h1>
            <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              5-Year Pattern Matcher
            </span>
          </div>
          <p className="text-xs text-zinc-400">Institutional Indian Index Historical Analog & Expectancy Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="hidden sm:flex items-center gap-2 text-zinc-400">
          <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>Market: <strong className="text-zinc-200">NSE / BSE Daily</strong></span>
        </div>
        {lastUpdated && (
          <div className="text-zinc-400">
            Last Session: <span className="text-zinc-200 font-semibold">{lastUpdated}</span>
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition text-xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};

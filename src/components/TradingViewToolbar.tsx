import React from 'react';
import { IndexKey, INDICES } from '@/lib/types';
import {
  SlidersHorizontal,
  LayoutGrid,
  ChevronDown,
  Cloud,
  Check,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

interface TradingViewToolbarProps {
  selectedSymbol: IndexKey;
  onSelectSymbol: (key: IndexKey) => void;
  timeframeMode: 'daily' | '1m';
  onSelectTimeframeMode: (mode: 'daily' | '1m') => void;
  patternWindow: number;
  onSelectWindow: (w: number) => void;
  currentPrice?: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TradingViewToolbar: React.FC<TradingViewToolbarProps> = ({
  selectedSymbol,
  onSelectSymbol,
  timeframeMode,
  onSelectTimeframeMode,
  patternWindow,
  onSelectWindow,
  currentPrice,
  isRefreshing,
  onRefresh,
  theme,
  onToggleTheme,
}) => {
  const [symbolDropdownOpen, setSymbolDropdownOpen] = React.useState(false);
  const activeInfo = INDICES[selectedSymbol];

  const indices: IndexKey[] = ['^NSEBANK', '^NSEI', '^BSESN'];
  const isDark = theme === 'dark';

  return (
    <div
      className={`h-12 border-b flex items-center justify-between px-3 text-xs select-none sticky top-0 z-50 transition-colors ${
        isDark
          ? 'border-[#2a2e39] bg-[#1e222d] text-[#d1d4dc]'
          : 'border-[#e0e3eb] bg-[#f0f3fa] text-[#131722]'
      }`}
    >
      {/* Left controls */}
      <div className="flex items-center gap-2">
        {/* TradingView / Stark Branding Pill */}
        <div
          className={`flex items-center gap-1.5 pr-2.5 border-r ${
            isDark ? 'border-[#2a2e39]' : 'border-[#e0e3eb]'
          }`}
        >
          <div className="h-6 w-6 rounded bg-[#2962ff] flex items-center justify-center font-bold text-white text-[11px] shadow">
            TV
          </div>
          <span className={`font-bold tracking-tight hidden sm:inline ${isDark ? 'text-white' : 'text-[#131722]'}`}>
            IndexFractal
          </span>
        </div>

        {/* Symbol Selector Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-bold tracking-wide transition ${
              isDark
                ? 'hover:bg-[#2a2e39] text-white'
                : 'hover:bg-[#e0e3eb] text-[#131722]'
            }`}
          >
            <span>{activeInfo.name}</span>
            <span
              className={`text-[10px] font-mono px-1 rounded ${
                isDark ? 'bg-[#131722] text-[#787b86]' : 'bg-[#ffffff] text-[#787b86] border border-[#e0e3eb]'
              }`}
            >
              {timeframeMode === '1m' ? '1m' : '1D'}
            </span>
            <span
              className={`text-[10px] font-mono px-1 rounded ${
                isDark ? 'bg-[#131722] text-[#787b86]' : 'bg-[#ffffff] text-[#787b86] border border-[#e0e3eb]'
              }`}
            >
              {activeInfo.tag}
            </span>
            <ChevronDown className="h-3 w-3 text-[#787b86]" />
          </button>

          {symbolDropdownOpen && (
            <div
              className={`absolute top-10 left-0 w-60 rounded-md border shadow-2xl py-1 z-50 ${
                isDark ? 'bg-[#1e222d] border-[#2a2e39]' : 'bg-[#ffffff] border-[#e0e3eb]'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] text-[#787b86] uppercase font-bold tracking-wider">
                Select Indian Index
              </div>
              {indices.map((key) => {
                const info = INDICES[key];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSelectSymbol(key);
                      setSymbolDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition ${
                      isDark ? 'hover:bg-[#2a2e39]' : 'hover:bg-[#f0f3fa]'
                    } ${
                      selectedSymbol === key
                        ? 'text-[#2962ff] font-bold'
                        : isDark
                        ? 'text-[#d1d4dc]'
                        : 'text-[#131722]'
                    }`}
                  >
                    <span>{info.name}</span>
                    <span className="text-[10px] text-[#787b86] font-mono">{info.tvSymbol}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timeframe Buttons: 1m vs 1D */}
        <div
          className={`flex items-center border-l pl-2 gap-1 font-mono text-[11px] ${
            isDark ? 'border-[#2a2e39]' : 'border-[#e0e3eb]'
          }`}
        >
          <button
            onClick={() => {
              onSelectTimeframeMode('1m');
              onSelectWindow(20);
            }}
            className={`px-2 py-1 rounded transition ${
              timeframeMode === '1m'
                ? 'bg-[#2962ff] text-white font-bold'
                : isDark
                ? 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                : 'text-[#787b86] hover:text-[#131722] hover:bg-[#e0e3eb]'
            }`}
          >
            1m (Supabase)
          </button>
          <button
            onClick={() => {
              onSelectTimeframeMode('daily');
              onSelectWindow(10);
            }}
            className={`px-2 py-1 rounded transition ${
              timeframeMode === 'daily'
                ? 'bg-[#2962ff] text-white font-bold'
                : isDark
                ? 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                : 'text-[#787b86] hover:text-[#131722] hover:bg-[#e0e3eb]'
            }`}
          >
            1D (Daily)
          </button>
        </div>

        {/* Window Lookback Range Buttons */}
        <div
          className={`flex items-center border-l pl-2 gap-1 text-[11px] font-mono ${
            isDark ? 'border-[#2a2e39]' : 'border-[#e0e3eb]'
          }`}
        >
          <span className="text-[#787b86] hidden md:inline">Window:</span>
          {(timeframeMode === '1m' ? [15, 20, 30, 45] : [5, 10, 20, 45]).map((w) => (
            <button
              key={w}
              onClick={() => onSelectWindow(w)}
              className={`px-2 py-0.5 rounded transition ${
                patternWindow === w
                  ? 'bg-[#2962ff] text-white font-bold'
                  : isDark
                  ? 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                  : 'text-[#787b86] hover:text-[#131722] hover:bg-[#e0e3eb]'
              }`}
            >
              {w}{timeframeMode === '1m' ? 'm' : 'D'}
            </button>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        {/* Live Spot Price */}
        {currentPrice && (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#787b86] hidden sm:inline">LTP:</span>
            <span
              className={`font-extrabold px-2 py-0.5 rounded border ${
                isDark
                  ? 'bg-[#131722] border-[#2a2e39] text-white'
                  : 'bg-[#ffffff] border-[#e0e3eb] text-[#131722]'
              }`}
            >
              ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Dual Layout Indicator */}
        <div
          className={`flex items-center gap-1 p-1 rounded border text-[10px] font-mono text-[#787b86] ${
            isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-[#ffffff] border-[#e0e3eb]'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5 text-[#2962ff]" />
          <span className="hidden md:inline">Dual View</span>
        </div>

        {/* Theme Toggle Button (Pure Black vs Pure White) */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition text-[11px] font-mono ${
            isDark
              ? 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc] hover:text-white'
              : 'bg-[#ffffff] border-[#e0e3eb] text-[#131722] hover:bg-[#f0f3fa]'
          }`}
          title={isDark ? 'Switch to Pure White Mode' : 'Switch to Pure Black Mode'}
        >
          {isDark ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">White Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden sm:inline">Black Mode</span>
            </>
          )}
        </button>

        {/* Cloud Saved Checkmark */}
        <div className="flex items-center gap-1 text-[#089981] text-[11px] hidden sm:flex" title="Cloud Synced">
          <Cloud className="h-3.5 w-3.5" />
          <Check className="h-3 w-3" />
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className={`p-1.5 rounded transition ${
            isDark
              ? 'hover:bg-[#2a2e39] text-[#787b86] hover:text-white'
              : 'hover:bg-[#e0e3eb] text-[#787b86] hover:text-[#131722]'
          } ${isRefreshing ? 'animate-spin text-[#2962ff]' : ''}`}
          title="Refresh Analysis"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

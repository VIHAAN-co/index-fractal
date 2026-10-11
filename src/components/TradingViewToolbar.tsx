import React from 'react';
import { IndexKey, INDICES } from '@/lib/types';
import {
  BarChart2,
  SlidersHorizontal,
  LayoutGrid,
  Camera,
  Settings,
  ChevronDown,
  Cloud,
  Check,
  Maximize2,
  Zap,
  Calendar,
} from 'lucide-react';

interface TradingViewToolbarProps {
  selectedSymbol: IndexKey;
  onSelectSymbol: (key: IndexKey) => void;
  timeframeMode: 'daily' | '1m';
  onSelectTimeframeMode: (mode: 'daily' | '1m') => void;
  patternWindow: number;
  onSelectWindow: (w: number) => void;
  currentPrice?: number;
  lastUpdated?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const TradingViewToolbar: React.FC<TradingViewToolbarProps> = ({
  selectedSymbol,
  onSelectSymbol,
  timeframeMode,
  onSelectTimeframeMode,
  patternWindow,
  onSelectWindow,
  currentPrice,
  lastUpdated,
  isRefreshing,
  onRefresh,
}) => {
  const [symbolDropdownOpen, setSymbolDropdownOpen] = React.useState(false);
  const activeInfo = INDICES[selectedSymbol];

  const indices: IndexKey[] = ['^NSEBANK', '^NSEI', '^BSESN'];

  return (
    <div className="h-12 border-b border-[#2a2e39] bg-[#1e222d] text-[#d1d4dc] flex items-center justify-between px-3 text-xs select-none sticky top-0 z-50">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        {/* TradingView / Stark Branding Pill */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-[#2a2e39]">
          <div className="h-6 w-6 rounded bg-[#2962ff] flex items-center justify-center font-bold text-white text-[11px] shadow">
            TV
          </div>
          <span className="font-bold tracking-tight text-white hidden sm:inline">IndexFractal</span>
        </div>

        {/* Symbol Selector Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#2a2e39] font-bold text-white tracking-wide transition"
          >
            <span>{activeInfo.name}</span>
            <span className="text-[10px] text-[#787b86] font-mono px-1 rounded bg-[#131722]">
              {timeframeMode === '1m' ? '1m' : '1D'}
            </span>
            <span className="text-[10px] text-[#787b86] font-mono px-1 rounded bg-[#131722]">
              {activeInfo.tag}
            </span>
            <ChevronDown className="h-3 w-3 text-[#787b86]" />
          </button>

          {symbolDropdownOpen && (
            <div className="absolute top-10 left-0 w-56 rounded-md bg-[#1e222d] border border-[#2a2e39] shadow-2xl py-1 z-50">
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
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#2a2e39] transition ${
                      selectedSymbol === key ? 'text-[#2962ff] font-bold bg-[#2a2e39]/50' : 'text-[#d1d4dc]'
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

        {/* Timeframe Buttons (Exact TradingView style: 1m, 5m, 15m, 1D) */}
        <div className="hidden md:flex items-center border-l border-[#2a2e39] pl-2 gap-1 font-mono text-[11px]">
          <button
            onClick={() => {
              onSelectTimeframeMode('1m');
              onSelectWindow(20);
            }}
            className={`px-2 py-1 rounded transition ${
              timeframeMode === '1m'
                ? 'bg-[#2962ff] text-white font-bold'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
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
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
            }`}
          >
            1D (Daily)
          </button>
        </div>

        {/* Chart Style Icon (Candlesticks) */}
        <div className="hidden lg:flex items-center border-l border-[#2a2e39] pl-2 text-[#787b86]">
          <div className="p-1.5 rounded hover:bg-[#2a2e39] text-[#2962ff] cursor-pointer" title="Candlesticks">
            <BarChart2 className="h-4 w-4" />
          </div>
        </div>

        {/* Indicators Button fx */}
        <div className="flex items-center border-l border-[#2a2e39] pl-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#2a2e39] text-[#d1d4dc] text-[11px] transition"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#2962ff]" />
            <span className="hidden sm:inline">DTW Twins</span>
          </button>
        </div>

        {/* Pattern Window Quick Switcher */}
        <div className="flex items-center border-l border-[#2a2e39] pl-2 gap-1 text-[11px] font-mono">
          <span className="text-[#787b86] hidden sm:inline">Window:</span>
          {(timeframeMode === '1m' ? [15, 20, 30] : [5, 10, 20]).map((w) => (
            <button
              key={w}
              onClick={() => onSelectWindow(w)}
              className={`px-2 py-0.5 rounded transition ${
                patternWindow === w
                  ? 'bg-[#2a2e39] text-white font-bold border border-[#434651]'
                  : 'text-[#787b86] hover:text-[#d1d4dc]'
              }`}
            >
              {w}{timeframeMode === '1m' ? 'm' : 'D'}
            </button>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Live Spot Price */}
        {currentPrice && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#787b86] hidden sm:inline">LTP:</span>
            <span className="text-white font-extrabold px-2 py-0.5 rounded bg-[#131722] border border-[#2a2e39]">
              ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Dual Layout Indicator */}
        <div className="flex items-center gap-1 p-1 rounded bg-[#131722] border border-[#2a2e39] text-[10px] font-mono text-[#787b86]">
          <LayoutGrid className="h-3.5 w-3.5 text-[#2962ff]" />
          <span className="hidden md:inline">2 Charts</span>
        </div>

        {/* Cloud Saved Checkmark */}
        <div className="flex items-center gap-1 text-[#089981] text-[11px] hidden sm:flex" title="Cloud Synced">
          <Cloud className="h-3.5 w-3.5" />
          <Check className="h-3 w-3" />
        </div>

        {/* Fullscreen / Refresh */}
        <button
          onClick={onRefresh}
          className={`p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition ${
            isRefreshing ? 'animate-spin text-[#2962ff]' : ''
          }`}
          title="Refresh Analysis"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

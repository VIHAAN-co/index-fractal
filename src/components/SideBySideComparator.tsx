'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ComparisonData, AnalogMatch, Candle } from '@/lib/types';
import {
  createChart,
  IChartApi,
  CandlestickData,
  ColorType,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SideBySideComparatorProps {
  data: ComparisonData;
}

export const SideBySideComparator: React.FC<SideBySideComparatorProps> = ({ data }) => {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);

  const leftChartContainerRef = useRef<HTMLDivElement>(null);
  const rightChartContainerRef = useRef<HTMLDivElement>(null);

  const leftChartRef = useRef<IChartApi | null>(null);
  const rightChartRef = useRef<IChartApi | null>(null);

  const currentMatch: AnalogMatch | undefined =
    data.matches[selectedMatchIndex] || data.matches[0];

  const is1MinMode = typeof data.currentCandles[0]?.time === 'number';

  // Helper to render a standalone candlestick chart with TradingView palette
  const renderChart = (
    container: HTMLDivElement,
    candles: Candle[],
    chartRefStore: React.MutableRefObject<IChartApi | null>,
    isRightTwin: boolean = false
  ) => {
    if (chartRefStore.current) {
      try {
        chartRefStore.current.remove();
      } catch (e) {
        console.error(e);
      }
      chartRefStore.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 440,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#758696', width: 1, style: 3 },
        horzLine: { color: '#758696', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: is1MinMode,
        secondsVisible: false,
      },
    });

    chartRefStore.current = chart;

    // TradingView exact green and red candles
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#089981',
      downColor: '#f23645',
      borderVisible: false,
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
    });

    const rawData = candles.map((c) => ({
      time: (typeof c.time === 'number' ? Math.floor(c.time) : c.time) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    rawData.sort((a, b) => {
      const ta = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const tb = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return ta - tb;
    });

    const uniqueData: CandlestickData[] = [];
    const seenTimes = new Set<any>();
    for (const item of rawData) {
      if (!seenTimes.has(item.time)) {
        seenTimes.add(item.time);
        uniqueData.push(item);
      }
    }

    try {
      candleSeries.setData(uniqueData);
      chart.timeScale().fitContent();
    } catch (err) {
      console.error('Lightweight-charts setData error:', err);
    }
  };

  // Render Current Chart (Left)
  useEffect(() => {
    if (!leftChartContainerRef.current || data.extendedCurrentCandles.length === 0) return;
    renderChart(leftChartContainerRef.current, data.extendedCurrentCandles, leftChartRef, false);

    const handleResize = () => {
      if (leftChartContainerRef.current && leftChartRef.current) {
        leftChartRef.current.applyOptions({
          width: leftChartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (leftChartRef.current) {
        try {
          leftChartRef.current.remove();
        } catch (e) {}
        leftChartRef.current = null;
      }
    };
  }, [data.extendedCurrentCandles, is1MinMode]);

  // Render Historical Twin Chart (Right)
  useEffect(() => {
    if (!rightChartContainerRef.current || !currentMatch) return;
    renderChart(rightChartContainerRef.current, currentMatch.allCandles, rightChartRef, true);

    const handleResize = () => {
      if (rightChartContainerRef.current && rightChartRef.current) {
        rightChartRef.current.applyOptions({
          width: rightChartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rightChartRef.current) {
        try {
          rightChartRef.current.remove();
        } catch (e) {}
        rightChartRef.current = null;
      }
    };
  }, [currentMatch, is1MinMode]);

  if (!currentMatch) {
    return (
      <div className="p-8 rounded-lg border border-[#2a2e39] bg-[#131722] text-center font-mono text-xs text-[#787b86]">
        No historical twins found with &gt;60% shape similarity.
      </div>
    );
  }

  const formatDisplayTime = (val: string | number | undefined) => {
    if (!val) return '';
    if (typeof val === 'number') {
      const d = new Date(val * 1000);
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return String(val);
  };

  const currentFirstDate = formatDisplayTime(data.currentCandles[0]?.time);
  const currentLastDate = formatDisplayTime(
    data.currentCandles[data.currentCandles.length - 1]?.time
  );
  const isPositiveForward = currentMatch.forwardReturnPct >= 0;

  const latestCandle = data.currentCandles[data.currentCandles.length - 1] || {
    open: 0,
    high: 0,
    low: 0,
    close: 0,
  };

  return (
    <div className="space-y-2">
      {/* Historical Twin Selector Tabs (TradingView layout sub-bar) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded bg-[#1e222d] border border-[#2a2e39] text-xs">
        <div className="flex items-center gap-2 text-[#787b86]">
          <Layers className="h-4 w-4 text-[#2962ff]" />
          <span className="font-semibold text-[#d1d4dc]">Historical Fractal Matches:</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {data.matches.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchIndex(idx)}
              className={`px-3 py-1 rounded transition border ${
                selectedMatchIndex === idx
                  ? 'bg-[#2962ff] text-white font-bold border-[#2962ff] shadow-sm'
                  : 'bg-[#131722] text-[#787b86] border-[#2a2e39] hover:text-[#d1d4dc] hover:border-[#434651]'
              }`}
            >
              #{m.rank} {m.startDate.slice(0, 10)} ({m.similarityPct}% Match)
            </button>
          ))}
        </div>
      </div>

      {/* Dual Split-Screen Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left: Current Chart */}
        <div className="rounded border border-[#2a2e39] bg-[#131722] flex flex-col justify-between overflow-hidden shadow">
          {/* TradingView Legend Bar */}
          <div className="px-3 py-2 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#089981] animate-pulse" />
              <span className="font-bold text-white tracking-wide">
                {data.tvSymbol} • {is1MinMode ? '1m' : '1D'} • NSE
              </span>
              <span className="text-[11px] text-[#787b86]">
                Wave: {currentFirstDate} → {currentLastDate}
              </span>
            </div>
            <div className="font-mono text-xs text-[#d1d4dc] flex items-center gap-2">
              <span className="text-[#787b86]">C:</span>
              <span className="text-white font-bold">₹{data.currentPrice}</span>
              <span
                className={`text-[11px] font-bold ${
                  data.change1dPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                }`}
              >
                {data.change1dPct >= 0 ? '+' : ''}
                {data.change1dPct}%
              </span>
            </div>
          </div>

          {/* OHLC Bar (TradingView exact header numbers) */}
          <div className="px-3 py-1 bg-[#131722] border-b border-[#1e222d] text-[11px] font-mono text-[#787b86] flex items-center gap-3">
            <span>
              O: <strong className="text-[#d1d4dc]">{latestCandle.open}</strong>
            </span>
            <span>
              H: <strong className="text-[#d1d4dc]">{latestCandle.high}</strong>
            </span>
            <span>
              L: <strong className="text-[#d1d4dc]">{latestCandle.low}</strong>
            </span>
            <span>
              C: <strong className="text-[#d1d4dc]">{latestCandle.close}</strong>
            </span>
          </div>

          <div ref={leftChartContainerRef} className="w-full relative min-h-[440px]" />

          {/* Bottom Chart Status Bar */}
          <div className="px-3 py-1.5 border-t border-[#2a2e39] bg-[#1e222d] flex items-center justify-between text-[11px] font-mono text-[#787b86]">
            <span>Today&apos;s Active Price Action</span>
            <span>Live Feed</span>
          </div>
        </div>

        {/* Right: Historical Twin Chart */}
        <div className="rounded border border-[#2a2e39] bg-[#131722] flex flex-col justify-between overflow-hidden shadow">
          {/* TradingView Legend Bar */}
          <div className="px-3 py-2 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="font-bold text-[#f59e0b] tracking-wide">
                HISTORICAL TWIN #{currentMatch.rank} ({currentMatch.similarityPct}% MATCH)
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-[#787b86]">Follow-through:</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded ${
                  isPositiveForward
                    ? 'text-[#089981] bg-[#089981]/10'
                    : 'text-[#f23645] bg-[#f23645]/10'
                }`}
              >
                {isPositiveForward ? '+' : ''}
                {currentMatch.forwardReturnPct}%
              </span>
            </div>
          </div>

          {/* OHLC Bar / Date Stamp */}
          <div className="px-3 py-1 bg-[#131722] border-b border-[#1e222d] text-[11px] font-mono text-[#787b86] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Past Window:</span>
              <strong className="text-[#d1d4dc]">{currentMatch.startDate}</strong>
              <span>→</span>
              <strong className="text-[#d1d4dc]">{currentMatch.endDate}</strong>
            </div>
            <div>
              High Peak:{' '}
              <strong className="text-[#089981]">+{currentMatch.maxUpsidePct}%</strong>
            </div>
          </div>

          <div ref={rightChartContainerRef} className="w-full relative min-h-[440px]" />

          {/* Bottom Chart Status Bar */}
          <div className="px-3 py-1.5 border-t border-[#2a2e39] bg-[#1e222d] flex items-center justify-between text-[11px] font-mono text-[#787b86]">
            <span>Outcome: {currentMatch.endDate} → {currentMatch.forwardEndDate}</span>
            <span className={isPositiveForward ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
              {isPositiveForward ? 'Bullish Expansion' : 'Bearish Drop'}
            </span>
          </div>
        </div>
      </div>

      {/* TradingView Bar Replay & Verification Bar */}
      <div className="px-4 py-3 rounded bg-[#1e222d] border border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#089981]" />
          <span className="text-white font-bold">
            TRADINGVIEW VERIFICATION ANCHOR ({data.tvSymbol})
          </span>
        </div>

        <div className="text-xs text-[#d1d4dc] font-sans">
          Jump to date <strong className="text-[#2962ff] font-mono">{currentMatch.startDate}</strong> in TradingView.{' '}
          Price traversed from <strong className="text-white font-mono">₹{currentMatch.matchStartPrice}</strong> to{' '}
          <strong className="text-white font-mono">₹{currentMatch.matchEndPrice}</strong>, then swung to{' '}
          <strong className={isPositiveForward ? 'text-[#089981] font-mono' : 'text-[#f23645] font-mono'}>
            ₹{currentMatch.forwardEndPrice} ({isPositiveForward ? '+' : ''}{currentMatch.forwardReturnPct}%)
          </strong>.
        </div>
      </div>

      {/* TradingView Bottom Timebar */}
      <div className="h-8 border-t border-[#2a2e39] bg-[#1e222d] text-[#787b86] flex items-center justify-between px-3 text-[11px] font-mono select-none">
        <div className="flex items-center gap-2">
          {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'].map((rng) => (
            <button
              key={rng}
              className="px-1.5 py-0.5 rounded hover:text-white hover:bg-[#2a2e39] transition"
            >
              {rng}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>IST (UTC+5:30)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="hover:text-white cursor-pointer">%</span>
            <span className="hover:text-white cursor-pointer">log</span>
            <span className="text-[#2962ff] font-bold cursor-pointer">auto</span>
          </div>
        </div>
      </div>
    </div>
  );
};

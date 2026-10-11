'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ComparisonData, AnalogMatch, Candle } from '@/lib/types';
import {
  createChart,
  IChartApi,
  CandlestickData,
  ColorType,
  CandlestickSeries,
} from 'lightweight-charts';
import {
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ExternalLink,
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

  const currentMatch: AnalogMatch | undefined = data.matches[selectedMatchIndex] || data.matches[0];

  // Helper to render a standalone candlestick chart
  const renderChart = (
    container: HTMLDivElement,
    candles: Candle[],
    chartRefStore: React.MutableRefObject<IChartApi | null>
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
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa',
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#3f3f46', width: 1, style: 2 },
        horzLine: { color: '#3f3f46', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: false,
        secondsVisible: false,
      },
    });

    chartRefStore.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(candleData);
    chart.timeScale().fitContent();
  };

  // Render Current Chart (Left)
  useEffect(() => {
    if (!leftChartContainerRef.current || data.extendedCurrentCandles.length === 0) return;
    renderChart(leftChartContainerRef.current, data.extendedCurrentCandles, leftChartRef);

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
  }, [data.extendedCurrentCandles]);

  // Render Historical Twin Chart (Right)
  useEffect(() => {
    if (!rightChartContainerRef.current || !currentMatch) return;
    renderChart(rightChartContainerRef.current, currentMatch.allCandles, rightChartRef);

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
  }, [currentMatch]);

  if (!currentMatch) {
    return (
      <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center font-mono text-xs text-zinc-500">
        No historical twins found with &gt;60% shape similarity.
      </div>
    );
  }

  const currentFirstDate = data.currentCandles[0]?.time;
  const currentLastDate = data.currentCandles[data.currentCandles.length - 1]?.time;
  const isPositiveForward = currentMatch.forwardReturnPct >= 0;

  return (
    <div className="space-y-4">
      {/* 1. Historical Twin Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          <Layers className="h-4 w-4 text-amber-400" />
          <span>Closest Historical Twins (5-Year Scan):</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {data.matches.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchIndex(idx)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                selectedMatchIndex === idx
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              #{m.rank} {m.startDate.slice(0, 7)} ({m.similarityPct}% Match)
            </button>
          ))}
        </div>
      </div>

      {/* 2. Side-by-Side Dual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Current Chart */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800 font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  TODAY&apos;S MARKET ({data.name})
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Current {data.windowSize}-Day Wave
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-3">
              <span>
                Window: <strong className="text-zinc-200">{currentFirstDate}</strong> → <strong className="text-zinc-200">{currentLastDate}</strong>
              </span>
              <span>
                Close: <strong className="text-white">₹{data.currentPrice}</strong>
              </span>
            </div>
          </div>

          <div ref={leftChartContainerRef} className="w-full relative min-h-[380px]" />

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 text-center">
            *Recent real candlestick data up to latest official session
          </div>
        </div>

        {/* Right: Historical Twin Chart */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-zinc-950/90 flex flex-col justify-between relative shadow-lg shadow-amber-500/5">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800 font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <h3 className="text-sm font-bold text-amber-400 tracking-wide">
                  HISTORICAL TWIN #{currentMatch.rank} ({currentMatch.similarityPct}% MATCH)
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                Pattern + Outcome
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-3">
              <span>
                Matching Window: <strong className="text-zinc-200">{currentMatch.startDate}</strong> → <strong className="text-zinc-200">{currentMatch.endDate}</strong>
              </span>
              <span>
                End Price: <strong className="text-white">₹{currentMatch.matchEndPrice}</strong>
              </span>
            </div>
          </div>

          <div ref={rightChartContainerRef} className="w-full relative min-h-[380px]" />

          {/* Outcome Badge at Bottom of Right Chart */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">
              Next 10 Sessions ({currentMatch.endDate} → {currentMatch.forwardEndDate}):
            </span>
            <div
              className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                isPositiveForward
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isPositiveForward ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {isPositiveForward ? '+' : ''}
                {currentMatch.forwardReturnPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TradingView Verification Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Verify On TradingView (Real Past Candlesticks)
            </h4>
          </div>
          <span className="text-[11px] text-zinc-400">
            Symbol: <strong className="text-white">{data.tvSymbol}</strong>
          </span>
        </div>

        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
          Open your TradingView chart for <strong className="text-amber-400 font-mono">{data.tvSymbol}</strong> and jump to date{' '}
          <strong className="text-white font-mono">{currentMatch.startDate}</strong>. You will see this exact price pattern unfold from{' '}
          <strong className="text-white font-mono">₹{currentMatch.matchStartPrice}</strong> to{' '}
          <strong className="text-white font-mono">₹{currentMatch.matchEndPrice}</strong>. 
          Over the next 10 trading sessions (until <span className="text-white font-mono">{currentMatch.forwardEndDate}</span>), the market reached a high of{' '}
          <strong className="text-emerald-400 font-mono">₹{currentMatch.maxHighForward} (+{currentMatch.maxUpsidePct}%)</strong> and closed at{' '}
          <strong className="text-white font-mono">₹{currentMatch.forwardEndPrice} ({isPositiveForward ? '+' : ''}{currentMatch.forwardReturnPct}%)</strong>.
        </p>
      </div>
    </div>
  );
};

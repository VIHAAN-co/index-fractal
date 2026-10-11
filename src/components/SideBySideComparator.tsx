'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ComparisonData, AnalogMatch, Candle } from '@/lib/types';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  ColorType,
  CandlestickSeries,
} from 'lightweight-charts';
import {
  CheckCircle2,
  Clock,
  Layers,
  Camera,
  Maximize2,
  Trash2,
  Minus,
} from 'lucide-react';

interface SideBySideComparatorProps {
  data: ComparisonData;
  theme?: 'dark' | 'light';
}

export const SideBySideComparator: React.FC<SideBySideComparatorProps> = ({
  data,
  theme = 'dark',
}) => {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);

  const leftChartContainerRef = useRef<HTMLDivElement>(null);
  const rightChartContainerRef = useRef<HTMLDivElement>(null);

  const leftChartRef = useRef<IChartApi | null>(null);
  const rightChartRef = useRef<IChartApi | null>(null);

  const leftCandleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const rightCandleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const drawnLinesRef = useRef<any[]>([]);
  const [lineCount, setLineCount] = useState<number>(0);

  const isDark = theme === 'dark';
  const currentMatch: AnalogMatch | undefined =
    data.matches[selectedMatchIndex] || data.matches[0];

  const is1MinMode = typeof data.currentCandles[0]?.time === 'number';

  // Helper to render a standalone candlestick chart with TradingView palette
  const renderChart = (
    container: HTMLDivElement,
    candles: Candle[],
    chartRefStore: React.MutableRefObject<IChartApi | null>,
    seriesRefStore: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
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
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
        textColor: isDark ? '#787b86' : '#64748b',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? '#1e222d' : '#f0f3fa' },
        horzLines: { color: isDark ? '#1e222d' : '#f0f3fa' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: isDark ? '#758696' : '#94a3b8', width: 1, style: 3 },
        horzLine: { color: isDark ? '#758696' : '#94a3b8', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2a2e39' : '#e0e3eb',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: isDark ? '#2a2e39' : '#e0e3eb',
        timeVisible: is1MinMode,
        secondsVisible: false,
        barSpacing: is1MinMode ? 18 : 10,
        minBarSpacing: 6,
      },
    });

    chartRefStore.current = chart;

    // TradingView signature green and red candles
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#089981',
      downColor: '#f23645',
      borderVisible: false,
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
    });

    seriesRefStore.current = candleSeries;

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

  // Functional Drawing Tools: Add Horizontal Support Price Line
  const addSupportLine = () => {
    const series = leftCandleSeriesRef.current;
    if (!series || !data.currentPrice) return;
    const linePrice = Math.round(data.currentPrice * 0.998 * 100) / 100;
    const priceLine = series.createPriceLine({
      price: linePrice,
      color: '#2962ff',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `Support ₹${linePrice}`,
    });
    drawnLinesRef.current.push({ series, line: priceLine });
    setLineCount((c) => c + 1);
  };

  // Functional Drawing Tools: Add Horizontal Resistance Price Line
  const addResistanceLine = () => {
    const series = leftCandleSeriesRef.current;
    if (!series || !data.currentPrice) return;
    const linePrice = Math.round(data.currentPrice * 1.002 * 100) / 100;
    const priceLine = series.createPriceLine({
      price: linePrice,
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `Resistance ₹${linePrice}`,
    });
    drawnLinesRef.current.push({ series, line: priceLine });
    setLineCount((c) => c + 1);
  };

  // Functional Drawing Tools: Clear All Drawn Lines
  const clearAllLines = () => {
    for (const item of drawnLinesRef.current) {
      try {
        item.series.removePriceLine(item.line);
      } catch (e) {
        console.error(e);
      }
    }
    drawnLinesRef.current = [];
    setLineCount(0);
  };

  // Functional Drawing Tools: Reset Zoom / Fit Content
  const fitBothCharts = () => {
    leftChartRef.current?.timeScale().fitContent();
    rightChartRef.current?.timeScale().fitContent();
  };

  // Functional Drawing Tools: Take Screenshot
  const takeChartScreenshot = () => {
    const canvas = leftChartRef.current?.takeScreenshot();
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${data.tvSymbol}-chart.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Render Current Chart (Left)
  useEffect(() => {
    if (!leftChartContainerRef.current) return;
    const candlesToRender = is1MinMode ? data.currentCandles : data.extendedCurrentCandles;
    if (candlesToRender.length === 0) return;
    renderChart(
      leftChartContainerRef.current,
      candlesToRender,
      leftChartRef,
      leftCandleSeriesRef
    );

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
  }, [data.extendedCurrentCandles, is1MinMode, isDark]);

  // Render Historical Twin Chart (Right)
  useEffect(() => {
    if (!rightChartContainerRef.current || !currentMatch) return;
    renderChart(
      rightChartContainerRef.current,
      currentMatch.allCandles,
      rightChartRef,
      rightCandleSeriesRef
    );

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
  }, [currentMatch, is1MinMode, isDark]);

  if (!currentMatch) {
    return (
      <div
        className={`p-8 rounded-lg border text-center font-mono text-xs ${
          isDark
            ? 'border-[#2a2e39] bg-[#131722] text-[#787b86]'
            : 'border-[#e0e3eb] bg-[#ffffff] text-[#64748b]'
        }`}
      >
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
      {/* TradingView Action & Drawing Sub-Bar (100% Functional Tools) */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded border text-xs transition-colors ${
          isDark
            ? 'bg-[#1e222d] border-[#2a2e39] text-[#d1d4dc]'
            : 'bg-[#f0f3fa] border-[#e0e3eb] text-[#131722]'
        }`}
      >
        {/* Real Functional Drawing Tools */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-[#787b86] font-sans font-semibold mr-1">Drawing Tools:</span>
          <button
            onClick={addSupportLine}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition font-bold ${
              isDark
                ? 'bg-[#131722] border-[#2a2e39] text-[#2962ff] hover:bg-[#2a2e39]'
                : 'bg-[#ffffff] border-[#e0e3eb] text-[#2962ff] hover:bg-[#e0e3eb]'
            }`}
            title="Place Blue Support Line at Price"
          >
            <Minus className="h-3.5 w-3.5" />
            <span>+ Support</span>
          </button>

          <button
            onClick={addResistanceLine}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition font-bold ${
              isDark
                ? 'bg-[#131722] border-[#2a2e39] text-[#f59e0b] hover:bg-[#2a2e39]'
                : 'bg-[#ffffff] border-[#e0e3eb] text-[#f59e0b] hover:bg-[#e0e3eb]'
            }`}
            title="Place Orange Resistance Line at Price"
          >
            <Minus className="h-3.5 w-3.5" />
            <span>+ Resistance</span>
          </button>

          {lineCount > 0 && (
            <button
              onClick={clearAllLines}
              className="flex items-center gap-1 px-2 py-1 rounded border border-[#f23645]/40 text-[#f23645] hover:bg-[#f23645]/10 transition"
              title="Clear Drawn Lines"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear ({lineCount})</span>
            </button>
          )}

          <button
            onClick={fitBothCharts}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition ${
              isDark
                ? 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                : 'bg-[#ffffff] border-[#e0e3eb] text-[#64748b] hover:text-[#131722]'
            }`}
            title="Reset Zoom & Fit Content"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          <button
            onClick={takeChartScreenshot}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition ${
              isDark
                ? 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                : 'bg-[#ffffff] border-[#e0e3eb] text-[#64748b] hover:text-[#131722]'
            }`}
            title="Download PNG Screenshot"
          >
            <Camera className="h-3 w-3" />
            <span className="hidden sm:inline">Screenshot</span>
          </button>
        </div>

        {/* Historical Twin Selector Tabs */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-[#787b86] font-sans font-semibold mr-1">Twins:</span>
          {data.matches.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchIndex(idx)}
              className={`px-2.5 py-1 rounded transition border ${
                selectedMatchIndex === idx
                  ? 'bg-[#2962ff] text-white font-bold border-[#2962ff] shadow-sm'
                  : isDark
                  ? 'bg-[#131722] text-[#787b86] border-[#2a2e39] hover:text-[#d1d4dc]'
                  : 'bg-[#ffffff] text-[#64748b] border-[#e0e3eb] hover:text-[#131722]'
              }`}
            >
              #{m.rank} {m.startDate.slice(0, 10)} ({m.similarityPct}%)
            </button>
          ))}
        </div>
      </div>

      {/* Dual Split-Screen Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left: Current Chart */}
        <div
          className={`rounded border flex flex-col justify-between overflow-hidden shadow transition-colors ${
            isDark
              ? 'border-[#2a2e39] bg-[#131722]'
              : 'border-[#e0e3eb] bg-[#ffffff]'
          }`}
        >
          {/* TradingView Legend Bar */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between text-xs transition-colors ${
              isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-[#e0e3eb] bg-[#f0f3fa]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#089981] animate-pulse" />
              <span className={`font-bold tracking-wide ${isDark ? 'text-white' : 'text-[#131722]'}`}>
                {data.tvSymbol} • {is1MinMode ? '1m' : '1D'} • NSE
              </span>
              <span className="text-[11px] text-[#787b86]">
                Wave: {currentFirstDate} → {currentLastDate}
              </span>
            </div>
            <div className="font-mono text-xs flex items-center gap-2">
              <span className="text-[#787b86]">C:</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-[#131722]'}`}>
                ₹{data.currentPrice}
              </span>
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

          {/* OHLC Bar */}
          <div
            className={`px-3 py-1 border-b text-[11px] font-mono text-[#787b86] flex items-center gap-3 ${
              isDark ? 'bg-[#131722] border-[#1e222d]' : 'bg-[#ffffff] border-[#f0f3fa]'
            }`}
          >
            <span>
              O: <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>{latestCandle.open}</strong>
            </span>
            <span>
              H: <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>{latestCandle.high}</strong>
            </span>
            <span>
              L: <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>{latestCandle.low}</strong>
            </span>
            <span>
              C: <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>{latestCandle.close}</strong>
            </span>
          </div>

          <div ref={leftChartContainerRef} className="w-full relative min-h-[440px]" />

          {/* Bottom Chart Status Bar */}
          <div
            className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] font-mono text-[#787b86] ${
              isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-[#e0e3eb] bg-[#f0f3fa]'
            }`}
          >
            <span>Active Real-Time Candlestick Feed</span>
            <span>Live Feed</span>
          </div>
        </div>

        {/* Right: Historical Twin Chart */}
        <div
          className={`rounded border flex flex-col justify-between overflow-hidden shadow transition-colors ${
            isDark
              ? 'border-[#2a2e39] bg-[#131722]'
              : 'border-[#e0e3eb] bg-[#ffffff]'
          }`}
        >
          {/* TradingView Legend Bar */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between text-xs transition-colors ${
              isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-[#e0e3eb] bg-[#f0f3fa]'
            }`}
          >
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
          <div
            className={`px-3 py-1 border-b text-[11px] font-mono text-[#787b86] flex items-center justify-between ${
              isDark ? 'bg-[#131722] border-[#1e222d]' : 'bg-[#ffffff] border-[#f0f3fa]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Past Window:</span>
              <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>
                {currentMatch.startDate}
              </strong>
              <span>→</span>
              <strong className={isDark ? 'text-[#d1d4dc]' : 'text-[#131722]'}>
                {currentMatch.endDate}
              </strong>
            </div>
            <div>
              High Peak:{' '}
              <strong className="text-[#089981]">+{currentMatch.maxUpsidePct}%</strong>
            </div>
          </div>

          <div ref={rightChartContainerRef} className="w-full relative min-h-[440px]" />

          {/* Bottom Chart Status Bar */}
          <div
            className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] font-mono text-[#787b86] ${
              isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-[#e0e3eb] bg-[#f0f3fa]'
            }`}
          >
            <span>Outcome Window: {currentMatch.endDate} → {currentMatch.forwardEndDate}</span>
            <span
              className={
                isPositiveForward ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'
              }
            >
              {isPositiveForward ? 'Bullish Expansion' : 'Bearish Drop'}
            </span>
          </div>
        </div>
      </div>

      {/* TradingView Bar Replay & Verification Bar */}
      <div
        className={`px-4 py-3 rounded border flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-colors ${
          isDark
            ? 'bg-[#1e222d] border-[#2a2e39]'
            : 'bg-[#f0f3fa] border-[#e0e3eb]'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#089981]" />
          <span className={`font-bold ${isDark ? 'text-white' : 'text-[#131722]'}`}>
            TRADINGVIEW VERIFICATION ANCHOR ({data.tvSymbol})
          </span>
        </div>

        <div className={`text-xs font-sans ${isDark ? 'text-[#d1d4dc]' : 'text-[#334155]'}`}>
          Jump to date <strong className="text-[#2962ff] font-mono">{currentMatch.startDate}</strong> in TradingView.{' '}
          Price traversed from <strong className={isDark ? 'text-white font-mono' : 'text-[#131722] font-mono'}>₹{currentMatch.matchStartPrice}</strong> to{' '}
          <strong className={isDark ? 'text-white font-mono' : 'text-[#131722] font-mono'}>₹{currentMatch.matchEndPrice}</strong>, then swung to{' '}
          <strong className={isPositiveForward ? 'text-[#089981] font-mono' : 'text-[#f23645] font-mono'}>
            ₹{currentMatch.forwardEndPrice} ({isPositiveForward ? '+' : ''}{currentMatch.forwardReturnPct}%)
          </strong>.
        </div>
      </div>

      {/* TradingView Bottom Timebar */}
      <div
        className={`h-8 border-t flex items-center justify-between px-3 text-[11px] font-mono select-none transition-colors ${
          isDark
            ? 'border-[#2a2e39] bg-[#1e222d] text-[#787b86]'
            : 'border-[#e0e3eb] bg-[#f0f3fa] text-[#64748b]'
        }`}
      >
        <div className="flex items-center gap-2">
          {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'].map((rng) => (
            <button
              key={rng}
              className={`px-1.5 py-0.5 rounded transition ${
                isDark ? 'hover:text-white hover:bg-[#2a2e39]' : 'hover:text-[#131722] hover:bg-[#e0e3eb]'
              }`}
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
            <span className="hover:text-[#2962ff] cursor-pointer">%</span>
            <span className="hover:text-[#2962ff] cursor-pointer">log</span>
            <span className="text-[#2962ff] font-bold cursor-pointer">auto</span>
          </div>
        </div>
      </div>
    </div>
  );
};

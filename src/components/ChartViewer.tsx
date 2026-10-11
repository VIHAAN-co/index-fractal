'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, ColorType } from 'lightweight-charts';
import { Candle, AnalogMatch } from '@/lib/types';
import { Eye, Layers, TrendingUp } from 'lucide-react';

interface ChartViewerProps {
  candles: Candle[];
  patternWindow: number;
  matches: AnalogMatch[];
  symbolName: string;
}

export const ChartViewer: React.FC<ChartViewerProps> = ({
  candles,
  patternWindow,
  matches,
  symbolName,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [selectedAnalogIndex, setSelectedAnalogIndex] = useState<number>(0);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clean up previous instance if any
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 420,
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

    chartInstanceRef.current = chart;

    // Candlestick series
    const candleSeries = (chart as any).addCandlestickSeries({
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

    // If projection is enabled and we have a selected analog
    const activeAnalog = matches[selectedAnalogIndex] || matches[0];
    if (showProjection && activeAnalog && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const lastDate = new Date(lastCandle.time);
      const lastClose = lastCandle.close;

      const projectionSeries = (chart as any).addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        title: `Analog Path (${activeAnalog.startDate.slice(0, 7)})`,
        priceLineVisible: false,
      });

      // Map the normalized forward trajectory (+% changes) onto today's close price
      const forwardTrajectory = activeAnalog.normalizedForward;
      const projectionData: LineData[] = [
        { time: lastCandle.time as any, value: lastClose },
      ];

      forwardTrajectory.forEach((pctChange, idx) => {
        const nextDay = new Date(lastDate);
        // Advance trading days (skip weekends)
        let daysToAdd = idx + 1;
        let dayCount = 0;
        let curr = new Date(nextDay);
        while (dayCount < daysToAdd) {
          curr.setDate(curr.getDate() + 1);
          if (curr.getDay() !== 0 && curr.getDay() !== 6) {
            dayCount++;
          }
        }

        const isoDate = curr.toISOString().split('T')[0];
        const projectedPrice = Math.round(lastClose * (1 + pctChange / 100) * 100) / 100;

        projectionData.push({
          time: isoDate as any,
          value: projectedPrice,
        });
      });

      projectionSeries.setData(projectionData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [candles, matches, showProjection, selectedAnalogIndex]);

  const activeAnalog = matches[selectedAnalogIndex] || matches[0];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
            {symbolName} Daily Candlesticks + Historical Fractal Projection
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {matches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-mono">
              <span className="text-zinc-500 px-2 text-[11px]">Analog:</span>
              {matches.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedAnalogIndex(idx)}
                  className={`px-2.5 py-1 rounded transition text-xs ${
                    selectedAnalogIndex === idx
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  #{idx + 1} ({m.similarityScore}%)
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowProjection(!showProjection)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono transition ${
              showProjection
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{showProjection ? 'Projection ON' : 'Projection OFF'}</span>
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full relative min-h-[420px]" />

      {activeAnalog && showProjection && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Active Projection: Matching Period <strong className="text-zinc-200">{activeAnalog.startDate}</strong> to <strong className="text-zinc-200">{activeAnalog.endDate}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Correlation: <strong className="text-amber-400">{(activeAnalog.correlation * 100).toFixed(0)}%</strong></span>
            <span>Historical 5-Day Result: <strong className={activeAnalog.forward5dReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{activeAnalog.forward5dReturn >= 0 ? '+' : ''}{activeAnalog.forward5dReturn}%</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

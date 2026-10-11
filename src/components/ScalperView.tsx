'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ScalpAnalysis } from '@/lib/scalperEngine';
import {
  createChart,
  IChartApi,
  CandlestickData,
  LineData,
  ColorType,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Copy,
  Check,
  AlertOctagon,
  Activity,
  Layers,
} from 'lucide-react';

interface ScalperViewProps {
  data: ScalpAnalysis;
}

export const ScalperView: React.FC<ScalperViewProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const { signal, setup } = data;
  const isCall = signal === 'CALL_SCALP';
  const isPut = signal === 'PUT_SCALP';
  const isChop = signal === 'WAIT_CHOP';

  const copyTradePlan = () => {
    const text = `🎯 [${data.name} 1-MIN SCALP SETUP]\nInstrument: ${setup.label}\nEntry Zone: ₹${setup.entryZone[0]} - ₹${setup.entryZone[1]}\nStop Loss: ₹${setup.stopLoss}\nTarget 1: ₹${setup.target1}\nTarget 2: ₹${setup.target2}\nR:R: ${setup.riskReward}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!chartContainerRef.current || data.bars.length === 0) return;

    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.remove();
      } catch (e) {
        console.error('Error removing previous scalp chart:', e);
      }
      chartInstanceRef.current = null;
    }

    try {
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
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartInstanceRef.current = chart;

      // 1-Min Candlestick Series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });

      const candleData: CandlestickData[] = data.bars.map((b) => ({
        time: b.time as any,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));

      candleSeries.setData(candleData);

      // Session VWAP Series (Gold Line)
      const vwapSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'Session VWAP',
        priceLineVisible: false,
      });

      const vwapData: LineData[] = data.bars.map((b) => ({
        time: b.time as any,
        value: b.vwap,
      }));

      vwapSeries.setData(vwapData);

      // 15m ORB High Line (Blue Dashed)
      const orbHighSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: 2,
        title: '15m ORB High',
        priceLineVisible: false,
      });

      orbHighSeries.setData(
        data.bars.map((b) => ({
          time: b.time as any,
          value: data.orbHigh,
        }))
      );

      // 15m ORB Low Line (Purple Dashed)
      const orbLowSeries = chart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 1,
        lineStyle: 2,
        title: '15m ORB Low',
        priceLineVisible: false,
      });

      orbLowSeries.setData(
        data.bars.map((b) => ({
          time: b.time as any,
          value: data.orbLow,
        }))
      );

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
          try {
            chartInstanceRef.current.remove();
          } catch (e) {
            console.error('Error removing chart on unmount:', e);
          }
          chartInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Intraday chart rendering error:', err);
    }
  }, [data]);

  return (
    <div className="space-y-4">
      {/* 1. Tactical Scalp Signal Hero Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          isCall
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : isPut
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isCall
                ? 'bg-emerald-500/20 text-emerald-400'
                : isPut
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isCall ? (
              <Zap className="h-6 w-6" />
            ) : isPut ? (
              <TrendingDown className="h-6 w-6" />
            ) : (
              <AlertOctagon className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-black tracking-wide uppercase">
                {isCall
                  ? 'BUY CALL SCALP'
                  : isPut
                  ? 'BUY PUT SCALP'
                  : 'WAIT / NO-TRADE CHOP ZONE'}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 font-bold">
                {data.signalStrength}% Conviction
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5 font-mono">{data.tacticalNote}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyTradePlan}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700/80 transition text-xs font-mono font-bold shadow-md"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Plan!' : 'Copy Plan for Zerodha'}</span>
          </button>
        </div>
      </div>

      {/* 2. Zerodha Strike Execution Box & 4 Edge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strike Execution Box */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
              <span>ATM Option Strike Setup</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                R:R {setup.riskReward}
              </span>
            </div>

            <div className="text-2xl font-black font-mono tracking-tight text-white mb-3">
              {setup.label}
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-900/70 border border-zinc-800">
                <span className="text-zinc-400">Trigger Entry Zone:</span>
                <span className="text-amber-400 font-bold">
                  ₹{setup.entryZone[0]} - ₹{setup.entryZone[1]}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-zinc-900/70 border border-zinc-800">
                <span className="text-rose-400 font-semibold">Strict Stop Loss:</span>
                <span className="text-rose-400 font-bold">₹{setup.stopLoss}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-zinc-900/70 border border-zinc-800">
                <span className="text-emerald-400 font-semibold">Target 1 / Target 2:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{setup.target1} / ₹{setup.target2}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 mt-3 font-mono">
            *Levels reference underlying index spot price on Zerodha/TradingView.
          </p>
        </div>

        {/* 4 Quantitative Edge Telemetry Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {/* Session VWAP */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between font-mono">
            <div className="text-zinc-500 text-xs flex items-center justify-between">
              <span>Session VWAP</span>
              <Activity className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white mt-1">₹{data.vwap}</div>
              <div className="text-xs mt-1">
                <span
                  className={data.isAboveVwap ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
                >
                  {data.vwapDiffPct > 0 ? '+' : ''}
                  {data.vwapDiffPct}%
                </span>
                <span className="text-zinc-500 text-[11px] ml-1">
                  {data.isAboveVwap ? '(Above VWAP)' : '(Below VWAP)'}
                </span>
              </div>
            </div>
          </div>

          {/* 15m Opening Range (ORB) */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between font-mono">
            <div className="text-zinc-500 text-xs flex items-center justify-between">
              <span>15m ORB Boundaries</span>
              <Target className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-300 mt-1">
                H: <span className="text-sky-400">₹{data.orbHigh}</span> | L: <span className="text-purple-400">₹{data.orbLow}</span>
              </div>
              <div className="text-[11px] mt-1 font-semibold">
                {data.isAboveOrbHigh ? (
                  <span className="text-emerald-400">Breakout Above High</span>
                ) : data.isBelowOrbLow ? (
                  <span className="text-rose-400">Breakdown Below Low</span>
                ) : (
                  <span className="text-amber-400">Inside 15m Range</span>
                )}
              </div>
            </div>
          </div>

          {/* 1-Min Momentum */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between font-mono">
            <div className="text-zinc-500 text-xs flex items-center justify-between">
              <span>Fast EMA Trend (9 / 21)</span>
              <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-300 mt-1">
                EMA 9: ₹{data.ema9} | EMA 21: ₹{data.ema21}
              </div>
              <div className="text-[11px] mt-1 font-semibold">
                {data.ema9 >= data.ema21 ? (
                  <span className="text-emerald-400">Bullish 9/21 Alignment</span>
                ) : (
                  <span className="text-rose-400">Bearish 9/21 Alignment</span>
                )}
              </div>
            </div>
          </div>

          {/* Market Phase */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col justify-between font-mono">
            <div className="text-zinc-500 text-xs flex items-center justify-between">
              <span>Market Phase</span>
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-400 mt-1">{data.marketPhase}</div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Session Bars: {data.barsCount} (1-Min)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. High-Contrast 1-Minute Intraday Candlestick Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
              {data.name} 1-Minute Candlestick Chart + VWAP & ORB Bands
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>VWAP (₹{data.vwap})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>ORB High (₹{data.orbHigh})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span>ORB Low (₹{data.orbLow})</span>
            </div>
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full relative min-h-[420px]" />
      </div>
    </div>
  );
};

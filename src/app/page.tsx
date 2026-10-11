'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IndexKey, AnalysisResult } from '@/lib/types';
import { ScalpAnalysis } from '@/lib/scalperEngine';
import { Header } from '@/components/Header';
import { IndexSelector } from '@/components/IndexSelector';
import { MetricCards } from '@/components/MetricCards';
import { ChartViewer } from '@/components/ChartViewer';
import { AnalogsList } from '@/components/AnalogsList';
import { AiBrief } from '@/components/AiBrief';
import { ScalperView } from '@/components/ScalperView';
import { Sliders, AlertTriangle, Zap, Compass } from 'lucide-react';

export default function Home() {
  const [mode, setMode] = useState<'fractal' | 'scalper'>('scalper');
  const [selectedSymbol, setSelectedSymbol] = useState<IndexKey>('^NSEI');
  const [patternWindow, setPatternWindow] = useState<number>(20);

  // Fractal Data
  const [fractalData, setFractalData] = useState<AnalysisResult | null>(null);
  const [isLoadingFractal, setIsLoadingFractal] = useState<boolean>(false);

  // Scalper Data
  const [scalpData, setScalpData] = useState<ScalpAnalysis | null>(null);
  const [isLoadingScalp, setIsLoadingScalp] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch 5-Year Fractal Data
  const fetchFractal = useCallback(async (symbol: IndexKey, windowSize: number) => {
    setIsLoadingFractal(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analyze?symbol=${encodeURIComponent(symbol)}&window=${windowSize}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch pattern analysis');
      }
      setFractalData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred loading fractal data');
    } finally {
      setIsLoadingFractal(false);
    }
  }, []);

  // Fetch 1-Min Scalp Data
  const fetchScalp = useCallback(async (symbol: IndexKey) => {
    setIsLoadingScalp(true);
    setError(null);
    try {
      const res = await fetch(`/api/scalp?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch 1-min scalp data');
      }
      setScalpData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred loading scalp data');
    } finally {
      setIsLoadingScalp(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'scalper') {
      fetchScalp(selectedSymbol);
    } else {
      fetchFractal(selectedSymbol, patternWindow);
    }
  }, [mode, selectedSymbol, patternWindow, fetchScalp, fetchFractal]);

  const activePrice =
    mode === 'scalper' ? scalpData?.currentPrice : fractalData?.currentPrice;
  const activeChangePct =
    mode === 'scalper' ? scalpData?.change1dPct : fractalData?.change1dPct;
  const isLoading = mode === 'scalper' ? isLoadingScalp : isLoadingFractal;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        lastUpdated={fractalData?.lastUpdated}
        isRefreshing={isLoading}
        onRefresh={() => {
          if (mode === 'scalper') fetchScalp(selectedSymbol);
          else fetchFractal(selectedSymbol, patternWindow);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Mode Switcher: 1-Min Scalper vs 5-Year Fractal */}
        <div className="flex items-center justify-between p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner">
          <button
            onClick={() => setMode('scalper')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-bold transition ${
              mode === 'scalper'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>1-MIN SCALPER MODE (INTRADAY VWAP & ORB)</span>
          </button>

          <button
            onClick={() => setMode('fractal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-bold transition ${
              mode === 'fractal'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>5-YEAR FRACTAL ANALYZER (HISTORICAL ANALOGS)</span>
          </button>
        </div>

        {/* Index Selector (Nifty, Bank Nifty, Sensex) */}
        <div>
          <IndexSelector
            selected={selectedSymbol}
            onSelect={(sym) => setSelectedSymbol(sym)}
            currentPrice={activePrice}
            change1dPct={activeChangePct}
            isLoading={isLoading}
          />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3 text-sm font-mono">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* SCALPER VIEW */}
        {mode === 'scalper' && (
          <>
            {isLoadingScalp && !scalpData ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-500">
                <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="font-mono text-xs">
                  Streaming 1-minute bars, calculating session VWAP and ORB levels...
                </p>
              </div>
            ) : scalpData ? (
              <ScalperView data={scalpData} />
            ) : null}
          </>
        )}

        {/* FRACTAL VIEW */}
        {mode === 'fractal' && (
          <>
            {/* Pattern Window Slider / Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Sliders className="h-4 w-4 text-amber-400" />
                <span>Pattern Length Window:</span>
                <span className="font-bold text-amber-400">{patternWindow} Trading Days</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">
                  (~1 month price wave)
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs">
                {[15, 20, 30, 45].map((w) => (
                  <button
                    key={w}
                    onClick={() => setPatternWindow(w)}
                    className={`px-3 py-1 rounded-lg transition ${
                      patternWindow === w
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {w}D
                  </button>
                ))}
              </div>
            </div>

            {isLoadingFractal && !fractalData ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-500">
                <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="font-mono text-xs">
                  Scanning 5 years of daily candles & running pattern matching...
                </p>
              </div>
            ) : fractalData ? (
              <>
                <MetricCards data={fractalData} />
                <ChartViewer
                  candles={fractalData.recentCandles}
                  patternWindow={fractalData.patternWindow}
                  matches={fractalData.matches}
                  symbolName={fractalData.name}
                />
                <AiBrief
                  summary={fractalData.summary}
                  bias={fractalData.statistics.overallBias}
                />
                <AnalogsList matches={fractalData.matches} />
              </>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-zinc-900 py-4 px-6 text-center text-xs text-zinc-600 font-mono">
        IndexFractal · Institutional 1-Min Scalper & 5-Year Analog Engine · Stark Industries Terminal
      </footer>
    </div>
  );
}

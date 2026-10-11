'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IndexKey, AnalysisResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { IndexSelector } from '@/components/IndexSelector';
import { MetricCards } from '@/components/MetricCards';
import { ChartViewer } from '@/components/ChartViewer';
import { AnalogsList } from '@/components/AnalogsList';
import { AiBrief } from '@/components/AiBrief';
import { Sliders, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<IndexKey>('^NSEI');
  const [patternWindow, setPatternWindow] = useState<number>(20);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async (symbol: IndexKey, windowSize: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&window=${windowSize}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch pattern analysis');
      }
      setData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while loading data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis(selectedSymbol, patternWindow);
  }, [selectedSymbol, patternWindow, fetchAnalysis]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        lastUpdated={data?.lastUpdated}
        isRefreshing={isLoading}
        onRefresh={() => fetchAnalysis(selectedSymbol, patternWindow)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Index Selector (Nifty, Bank Nifty, Sensex) */}
        <div>
          <IndexSelector
            selected={selectedSymbol}
            onSelect={(sym) => setSelectedSymbol(sym)}
            currentPrice={data?.currentPrice}
            change1d={data?.change1d}
            change1dPct={data?.change1dPct}
            isLoading={isLoading}
          />
        </div>

        {/* Pattern Window Slider / Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <Sliders className="h-4 w-4 text-amber-400" />
            <span>Pattern Length Window:</span>
            <span className="font-bold text-amber-400">{patternWindow} Trading Days</span>
            <span className="text-zinc-500 text-[11px] hidden sm:inline">(~1 month price wave)</span>
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

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3 text-sm font-mono">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {isLoading && !data ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-500">
            <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="font-mono text-xs">Scanning 5 years of daily candles & running pattern matching...</p>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <MetricCards data={data} />

            {/* Candlestick Chart + Historical Projection Overlay */}
            <ChartViewer
              candles={data.recentCandles}
              patternWindow={data.patternWindow}
              matches={data.matches}
              symbolName={data.name}
            />

            {/* AI Quantitative Brief */}
            <AiBrief summary={data.summary} bias={data.statistics.overallBias} />

            {/* Historical Analogs Breakdown */}
            <AnalogsList matches={data.matches} />
          </>
        ) : null}
      </main>

      <footer className="border-t border-zinc-900 py-4 px-6 text-center text-xs text-zinc-600 font-mono">
        IndexFractal · 5-Year Institutional Analog Engine · Designed for Stark Industries Terminal
      </footer>
    </div>
  );
}

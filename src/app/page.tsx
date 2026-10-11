'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IndexKey, ComparisonData } from '@/lib/types';
import { Header } from '@/components/Header';
import { IndexSelector } from '@/components/IndexSelector';
import { SideBySideComparator } from '@/components/SideBySideComparator';
import { Sliders, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<IndexKey>('^NSEI');
  const [patternWindow, setPatternWindow] = useState<number>(10);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async (symbol: IndexKey, windowSize: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analyze?symbol=${encodeURIComponent(symbol)}&window=${windowSize}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load historical comparison');
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
    fetchComparison(selectedSymbol, patternWindow);
  }, [selectedSymbol, patternWindow, fetchComparison]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        lastUpdated={data?.lastUpdated}
        isRefreshing={isLoading}
        onRefresh={() => fetchComparison(selectedSymbol, patternWindow)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Index Selector (NIFTY 50, BANK NIFTY, SENSEX) */}
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

        {/* Lookback Window Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <Sliders className="h-4 w-4 text-amber-400" />
            <span>Pattern Lookback Window:</span>
            <span className="font-bold text-amber-400">{patternWindow} Trading Sessions</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            {[
              { days: 5, label: '5 Sessions (1 Wk)' },
              { days: 10, label: '10 Sessions (2 Wks)' },
              { days: 15, label: '15 Sessions (3 Wks)' },
              { days: 20, label: '20 Sessions (1 Mo)' },
            ].map(({ days, label }) => (
              <button
                key={days}
                onClick={() => setPatternWindow(days)}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  patternWindow === days
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                }`}
              >
                {label}
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

        {/* Loading Spinner */}
        {isLoading && !data ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-500">
            <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="font-mono text-xs">
              Scanning 5 years of daily market history for matching chart structures...
            </p>
          </div>
        ) : data ? (
          /* Side-by-Side Dual Chart & TradingView Verification Engine */
          <SideBySideComparator data={data} />
        ) : null}
      </main>

      <footer className="border-t border-zinc-900 py-4 px-6 text-center text-xs text-zinc-600 font-mono">
        IndexFractal · Real Verifiable Historical Chart Comparator · Stark Industries Terminal
      </footer>
    </div>
  );
}

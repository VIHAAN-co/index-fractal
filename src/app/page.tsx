'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IndexKey, ComparisonData } from '@/lib/types';
import { TradingViewToolbar } from '@/components/TradingViewToolbar';
import { TradingViewLeftToolbar } from '@/components/TradingViewLeftToolbar';
import { SideBySideComparator } from '@/components/SideBySideComparator';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const [timeframeMode, setTimeframeMode] = useState<'daily' | '1m'>('1m');
  const [selectedSymbol, setSelectedSymbol] = useState<IndexKey>('^NSEBANK');
  const [patternWindow, setPatternWindow] = useState<number>(20);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (timeframeMode === '1m') {
        endpoint = `/api/analog-1m?window=${patternWindow}`;
      } else {
        endpoint = `/api/analyze?symbol=${encodeURIComponent(selectedSymbol)}&window=${patternWindow}`;
      }

      const res = await fetch(endpoint);
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
  }, [timeframeMode, selectedSymbol, patternWindow]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return (
    <div className="min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col font-sans select-none overflow-x-hidden">
      {/* TradingView Top Toolbar */}
      <TradingViewToolbar
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => setSelectedSymbol(sym)}
        timeframeMode={timeframeMode}
        onSelectTimeframeMode={(m) => {
          setTimeframeMode(m);
          setPatternWindow(m === '1m' ? 20 : 10);
        }}
        patternWindow={patternWindow}
        onSelectWindow={(w) => setPatternWindow(w)}
        currentPrice={data?.currentPrice}
        lastUpdated={data?.lastUpdated}
        isRefreshing={isLoading}
        onRefresh={fetchComparison}
      />

      {/* Main Terminal: Left Drawing Tools + Center Dual Charts */}
      <div className="flex-1 flex overflow-hidden">
        {/* TradingView Left Drawing Tools Toolbar */}
        <TradingViewLeftToolbar />

        {/* Center Workspace */}
        <main className="flex-1 p-2 space-y-2 overflow-y-auto">
          {error && (
            <div className="p-3 rounded bg-[#f23645]/10 border border-[#f23645]/30 text-[#f23645] flex items-center gap-2 text-xs font-mono">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && !data ? (
            <div className="h-[550px] flex flex-col items-center justify-center space-y-3 text-[#787b86]">
              <div className="h-8 w-8 rounded-full border-2 border-[#2962ff] border-t-transparent animate-spin" />
              <p className="font-mono text-xs">
                {timeframeMode === '1m'
                  ? 'Executing DTW across 150,000 Supabase historical 1-minute bars...'
                  : 'Computing fractal alignment across 5 years of daily market history...'}
              </p>
            </div>
          ) : data ? (
            <SideBySideComparator data={data} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Candle, AnalogMatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

function zScoreNormalize(prices: number[]): number[] {
  const n = prices.length;
  if (n === 0) return [];
  const mean = prices.reduce((a, b) => a + b, 0) / n;
  const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1e-6;
  return prices.map((p) => (p - mean) / std);
}

function dynamicTimeWarping(s1: number[], s2: number[], w: number = 3): number {
  const n = s1.length;
  const m = s2.length;
  const windowRadius = Math.max(w, Math.abs(n - m));

  const dtw: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  );
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - windowRadius);
    const jEnd = Math.min(m, i + windowRadius);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = Math.abs(s1[i - 1] - s2[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],
        dtw[i][j - 1],
        dtw[i - 1][j - 1]
      );
    }
  }
  return dtw[n][m] / (n + m);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const windowSize = parseInt(searchParams.get('window') || '20', 10);

    // 1. Fetch live 1-minute intraday bars from Yahoo Finance for Bank Nifty
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/%5ENSEBANK?range=1d&interval=1m&includePrePost=false`;
    const yfRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 30 },
    });

    if (!yfRes.ok) {
      throw new Error(`Failed to fetch current 1-min data: HTTP ${yfRes.status}`);
    }

    const yfJson = await yfRes.json();
    const result = yfJson?.chart?.result?.[0];
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators.quote[0];

    const currentLiveCandles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = quote.close[i];
      if (c !== null && !isNaN(c)) {
        const d = new Date(timestamps[i] * 1000);
        const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
        currentLiveCandles.push({
          time: timeStr,
          open: Math.round((quote.open[i] || c) * 100) / 100,
          high: Math.round((quote.high[i] || c) * 100) / 100,
          low: Math.round((quote.low[i] || c) * 100) / 100,
          close: Math.round(c * 100) / 100,
          volume: quote.volume[i] || 0,
        });
      }
    }

    const activeSlice = currentLiveCandles.slice(-windowSize);
    const activeCloses = activeSlice.map((c) => c.close);
    const activeZScore = zScoreNormalize(activeCloses);

    // 2. Query deep 1-minute historical sessions from Supabase
    // We fetch a diverse historical sample of 1-minute session chunks
    const { data: histRows, error: sbError } = await supabase
      .from('banknifty_1m')
      .select('date, time, open, high, low, close')
      .order('id', { ascending: false })
      .limit(3000);

    if (sbError || !histRows || histRows.length < windowSize + 15) {
      throw new Error(sbError?.message || 'Insufficient deep historical 1-min data in Supabase');
    }

    // Convert to structured candles
    const histCandles: Candle[] = histRows.map((r) => ({
      time: `${r.date} ${r.time.slice(0, 5)}`,
      open: parseFloat(r.open),
      high: parseFloat(r.high),
      low: parseFloat(r.low),
      close: parseFloat(r.close),
      volume: 0,
    }));
    // Order chronologically
    histCandles.reverse();

    // 3. Slide window & compute DTW distance
    const candidates: { startIndex: number; dtwDistance: number }[] = [];
    const limit = histCandles.length - windowSize - 12;

    for (let i = 0; i < limit; i++) {
      const slice = histCandles.slice(i, i + windowSize);
      const closes = slice.map((c) => c.close);
      const zscore = zScoreNormalize(closes);
      const dtwDist = dynamicTimeWarping(activeZScore, zscore, 3);
      candidates.push({ startIndex: i, dtwDistance: dtwDist });
    }

    candidates.sort((a, b) => a.dtwDistance - b.dtwDistance);

    // Pick top 3 non-overlapping 1-minute twins
    const matches: AnalogMatch[] = [];
    const chosenIndices: number[] = [];

    for (const cand of candidates) {
      const isOverlapping = chosenIndices.some(
        (idx) => Math.abs(idx - cand.startIndex) < Math.floor(windowSize * 0.8)
      );

      if (!isOverlapping) {
        chosenIndices.push(cand.startIndex);

        const patternSlice = histCandles.slice(cand.startIndex, cand.startIndex + windowSize);
        const forwardSlice = histCandles.slice(cand.startIndex + windowSize, cand.startIndex + windowSize + 12);
        const allCandles = [...patternSlice, ...forwardSlice];

        const matchStartPrice = patternSlice[0].close;
        const matchEndPrice = patternSlice[patternSlice.length - 1].close;
        const forwardEndPrice = forwardSlice[forwardSlice.length - 1]?.close || matchEndPrice;

        const forwardReturnPct = Math.round(((forwardEndPrice - matchEndPrice) / matchEndPrice) * 10000) / 100;
        const maxHigh = Math.max(...forwardSlice.map((c) => c.high), matchEndPrice);
        const minLow = Math.min(...forwardSlice.map((c) => c.low), matchEndPrice);

        const maxUpsidePct = Math.round(((maxHigh - matchEndPrice) / matchEndPrice) * 10000) / 100;
        const maxDrawdownPct = Math.round(((minLow - matchEndPrice) / matchEndPrice) * 10000) / 100;

        const similarityPct = Math.round(Math.max(65, Math.min(99, (1 - cand.dtwDistance * 0.5) * 100)));

        matches.push({
          id: `1m-twin-${cand.startIndex}`,
          rank: matches.length + 1,
          startDate: patternSlice[0].time,
          endDate: patternSlice[patternSlice.length - 1].time,
          forwardEndDate: forwardSlice[forwardSlice.length - 1]?.time || patternSlice[patternSlice.length - 1].time,
          correlation: Math.round((1 - cand.dtwDistance * 0.5) * 100) / 100,
          similarityPct,
          matchStartPrice,
          matchEndPrice,
          forwardEndPrice,
          forwardReturnPct,
          maxHighForward: maxHigh,
          maxLowForward: minLow,
          maxUpsidePct,
          maxDrawdownPct,
          patternCandles: patternSlice,
          forwardCandles: forwardSlice,
          allCandles,
        });

        if (matches.length >= 3) break;
      }
    }

    const currentCandle = activeSlice[activeSlice.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        symbol: '^NSEBANK',
        name: 'BANK NIFTY (1-MIN BARS)',
        tvSymbol: 'NSE:BANKNIFTY',
        currentPrice: currentCandle.close,
        change1d: 0,
        change1dPct: 0,
        lastUpdated: currentCandle.time,
        windowSize,
        currentCandles: activeSlice,
        extendedCurrentCandles: currentLiveCandles.slice(-Math.max(40, windowSize + 15)),
        matches,
      },
    });
  } catch (error: any) {
    console.error('1-min analog error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process 1-min historical analog' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Candle, AnalogMatch, IndexKey, INDICES } from '@/lib/types';

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
    const rawSymbol = searchParams.get('symbol') || '^NSEBANK';
    const rawWindow = parseInt(searchParams.get('window') || '20', 10);

    const validSymbols: IndexKey[] = ['^NSEBANK', '^NSEI', '^BSESN'];
    const symbol: IndexKey = validSymbols.includes(rawSymbol as IndexKey)
      ? (rawSymbol as IndexKey)
      : '^NSEBANK';

    const windowSize = isNaN(rawWindow) || rawWindow < 10 || rawWindow > 60 ? 20 : rawWindow;
    const indexInfo = INDICES[symbol];

    // 1. Fetch live 1-minute intraday bars from Yahoo Finance
    const encoded = encodeURIComponent(symbol);
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?range=7d&interval=1m&includePrePost=false`;
    const yfRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 30 },
    });

    if (!yfRes.ok) {
      throw new Error(`Failed to fetch 1-min data for ${symbol}: HTTP ${yfRes.status}`);
    }

    const yfJson = await yfRes.json();
    const result = yfJson?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};

    const allLiveCandles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = quote.close?.[i];
      if (c !== null && c !== undefined && !isNaN(c)) {
        allLiveCandles.push({
          time: timestamps[i],
          open: Math.round((quote.open?.[i] || c) * 100) / 100,
          high: Math.round((quote.high?.[i] || c) * 100) / 100,
          low: Math.round((quote.low?.[i] || c) * 100) / 100,
          close: Math.round(c * 100) / 100,
          volume: quote.volume?.[i] || 0,
        });
      }
    }

    if (allLiveCandles.length < windowSize) {
      throw new Error(`Insufficient 1-min candles for ${symbol}`);
    }

    // Extract today's full session candles (09:15 to current / close)
    const getISTDate = (unixSec: number) => {
      const d = new Date(unixSec * 1000);
      return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    };

    const latestDayStr = getISTDate(allLiveCandles[allLiveCandles.length - 1].time as number);
    const todayCandles = allLiveCandles.filter(
      (c) => getISTDate(c.time as number) === latestDayStr
    );
    const fullSessionCandles = todayCandles.length >= 10 ? todayCandles : allLiveCandles.slice(-375);

    // Active recent window for DTW pattern matching
    const activeSlice = allLiveCandles.slice(-windowSize);
    const activeCloses = activeSlice.map((c) => c.close);
    const activeZScore = zScoreNormalize(activeCloses);

    interface HistItem {
      candle: Candle;
      dateLabel: string;
    }

    let histItems: HistItem[] = [];

    // 2. Query historical bars:
    // If Bank Nifty: use Supabase 150,000 historical bars
    // If Nifty / Sensex: use prior sessions from the 7-day 1-minute dataset (2,600 bars)
    if (symbol === '^NSEBANK') {
      try {
        const { data: histRows } = await supabase
          .from('banknifty_1m')
          .select('date, time, open, high, low, close')
          .order('id', { ascending: false })
          .limit(3000);

        if (histRows && histRows.length >= windowSize + 15) {
          histItems = histRows.map((r, idx) => {
            let unixSec = 0;
            try {
              const [d, m, y] = r.date.split('-');
              const [hr, min, sec] = r.time.split(':');
              const dt = new Date(
                Date.UTC(
                  parseInt(y),
                  parseInt(m) - 1,
                  parseInt(d),
                  parseInt(hr),
                  parseInt(min),
                  parseInt(sec || 0)
                )
              );
              unixSec = Math.floor(dt.getTime() / 1000);
            } catch (e) {
              unixSec = 1713783000 + idx * 60;
            }
            return {
              dateLabel: `${r.date} ${r.time.slice(0, 5)}`,
              candle: {
                time: unixSec,
                open: parseFloat(r.open),
                high: parseFloat(r.high),
                low: parseFloat(r.low),
                close: parseFloat(r.close),
                volume: 0,
              },
            };
          });
          histItems.reverse();
        }
      } catch (e) {
        console.error('Supabase query error:', e);
      }
    }

    // Fallback or for Nifty / Sensex: use prior trading sessions
    if (histItems.length === 0) {
      const historicalCandlesPool = allLiveCandles.slice(
        0,
        Math.max(windowSize + 20, allLiveCandles.length - windowSize - 30)
      );
      histItems = historicalCandlesPool.map((c) => {
        const d = new Date((c.time as number) * 1000);
        const dateStr = d.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          dateLabel: `${dateStr} ${timeStr}`,
          candle: c,
        };
      });
    }

    // 3. Slide window & compute DTW distance
    const candidates: { startIndex: number; dtwDistance: number }[] = [];
    const limit = histItems.length - windowSize - 12;

    for (let i = 0; i < limit; i++) {
      const slice = histItems.slice(i, i + windowSize);
      const closes = slice.map((item) => item.candle.close);
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

        const patternItems = histItems.slice(cand.startIndex, cand.startIndex + windowSize);
        const forwardItems = histItems.slice(
          cand.startIndex + windowSize,
          cand.startIndex + windowSize + 25
        );

        const patternCandles = patternItems.map((pi) => pi.candle);
        const forwardCandles = forwardItems.map((fi) => fi.candle);

        const contextBefore = Math.max(0, cand.startIndex - 35);
        const contextAfter = Math.min(histItems.length, cand.startIndex + windowSize + 45);
        const sessionCandles = histItems.slice(contextBefore, contextAfter).map((item) => item.candle);
        const allCandles = sessionCandles.length > 0 ? sessionCandles : [...patternCandles, ...forwardCandles];

        const matchStartPrice = patternCandles[0].close;
        const matchEndPrice = patternCandles[patternCandles.length - 1].close;
        const forwardEndPrice =
          forwardCandles[forwardCandles.length - 1]?.close || matchEndPrice;

        const forwardReturnPct =
          Math.round(((forwardEndPrice - matchEndPrice) / matchEndPrice) * 10000) / 100;
        const maxHigh = Math.max(...forwardCandles.map((c) => c.high), matchEndPrice);
        const minLow = Math.min(...forwardCandles.map((c) => c.low), matchEndPrice);

        const maxUpsidePct =
          Math.round(((maxHigh - matchEndPrice) / matchEndPrice) * 10000) / 100;
        const maxDrawdownPct =
          Math.round(((minLow - matchEndPrice) / matchEndPrice) * 10000) / 100;

        const similarityPct = Math.round(
          Math.max(65, Math.min(99, (1 - cand.dtwDistance * 0.5) * 100))
        );

        matches.push({
          id: `1m-twin-${cand.startIndex}`,
          rank: matches.length + 1,
          startDate: patternItems[0].dateLabel,
          endDate: patternItems[patternItems.length - 1].dateLabel,
          forwardEndDate:
            forwardItems[forwardItems.length - 1]?.dateLabel ||
            patternItems[patternItems.length - 1].dateLabel,
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
          patternCandles,
          forwardCandles,
          allCandles,
        });

        if (matches.length >= 3) break;
      }
    }

    const currentCandle = activeSlice[activeSlice.length - 1];
    const prevCandle = activeSlice[activeSlice.length - 2] || currentCandle;
    const change1d = Math.round((currentCandle.close - prevCandle.close) * 100) / 100;
    const change1dPct = Math.round((change1d / prevCandle.close) * 10000) / 100;

    const lastDate = new Date((currentCandle.time as number) * 1000);
    const lastDateStr = lastDate.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        name: `${indexInfo.name} (1-MIN)`,
        tvSymbol: indexInfo.tvSymbol,
        currentPrice: currentCandle.close,
        change1d,
        change1dPct,
        lastUpdated: `Live ${lastDateStr}`,
        windowSize,
        currentCandles: fullSessionCandles,
        extendedCurrentCandles: fullSessionCandles,
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

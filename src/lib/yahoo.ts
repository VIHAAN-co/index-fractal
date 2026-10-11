import { Candle, IndexKey } from './types';

interface CachedData {
  timestamp: number;
  candles: Candle[];
}

const cache = new Map<string, CachedData>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export async function fetchHistoricalData(symbol: IndexKey): Promise<Candle[]> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.candles;
  }

  const encodedSymbol = encodeURIComponent(symbol);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=5y&interval=1d&includePrePost=false`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Yahoo Finance data for ${symbol}: HTTP ${response.status}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];

  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error(`Invalid data received from Yahoo Finance for ${symbol}`);
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const opens: (number | null)[] = quote.open;
  const highs: (number | null)[] = quote.high;
  const lows: (number | null)[] = quote.low;
  const closes: (number | null)[] = quote.close;
  const volumes: (number | null)[] = quote.volume || [];

  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i] ?? 0;

    // Filter out market holidays / null bars
    if (o !== null && h !== null && l !== null && c !== null && !isNaN(c)) {
      const date = new Date(timestamps[i] * 1000);
      const isoDate = date.toISOString().split('T')[0];

      candles.push({
        time: isoDate,
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: v,
      });
    }
  }

  // Deduplicate timestamps if any
  const uniqueCandles: Candle[] = [];
  const seenDates = new Set<string>();

  for (const candle of candles) {
    if (!seenDates.has(candle.time)) {
      seenDates.add(candle.time);
      uniqueCandles.push(candle);
    }
  }

  cache.set(symbol, {
    timestamp: Date.now(),
    candles: uniqueCandles,
  });

  return uniqueCandles;
}

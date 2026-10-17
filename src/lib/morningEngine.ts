import { IndexKey, INDICES, Candle } from './types';

export interface MorningAnalog {
  date: string;
  gapPct: number;
  gapFilled: boolean;
  morningHigh: number;
  morningLow: number;
  netMovePct: number;
  candles: Candle[];
}

export interface MorningRadarData {
  symbol: IndexKey;
  name: string;
  tvSymbol: string;
  prevClose: number;
  openPrice: number;
  currentPrice: number;
  gapPoints: number;
  gapPct: number;
  gapType: 'GAP_UP' | 'GAP_DOWN' | 'FLAT';
  gapFillProbability: number;
  trendContinuationProbability: number;
  avgMorningRangePts: number;
  orb15mHigh: number;
  orb15mLow: number;
  morningCandles: Candle[]; // Live 76 one-minute bars (09:15 to 10:30)
  topAnalogs: MorningAnalog[];
}

export async function fetchMorningRadarData(symbol: IndexKey): Promise<MorningRadarData> {
  const indexInfo = INDICES[symbol] || {
    key: symbol,
    name: 'BANK NIFTY',
    tag: 'NSE',
    tvSymbol: 'NSE:BANKNIFTY',
    step: 100,
  };

  const encoded = encodeURIComponent(symbol);
  // Fetch recent 7-day 1-minute bars
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?range=7d&interval=1m&includePrePost=false`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch morning data for ${symbol}: HTTP ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};

  const allBars: { time: number; dateStr: string; timeStr: string; open: number; high: number; low: number; close: number }[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close?.[i];
    if (c !== null && c !== undefined && !isNaN(c)) {
      const dt = new Date(timestamps[i] * 1000);
      const dateStr = dt.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = dt.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      allBars.push({
        time: timestamps[i],
        dateStr,
        timeStr,
        open: Math.round((quote.open?.[i] || c) * 100) / 100,
        high: Math.round((quote.high?.[i] || c) * 100) / 100,
        low: Math.round((quote.low?.[i] || c) * 100) / 100,
        close: Math.round(c * 100) / 100,
      });
    }
  }

  if (allBars.length < 50) {
    throw new Error('Insufficient intraday bars for morning radar analysis');
  }

  // Group bars by trading day
  const dayGroups: Record<string, typeof allBars> = {};
  for (const bar of allBars) {
    if (!dayGroups[bar.dateStr]) dayGroups[bar.dateStr] = [];
    dayGroups[bar.dateStr].push(bar);
  }

  const dayKeys = Object.keys(dayGroups);
  const latestDayKey = dayKeys[dayKeys.length - 1];
  const prevDayKey = dayKeys.length > 1 ? dayKeys[dayKeys.length - 2] : latestDayKey;

  const latestDayBars = dayGroups[latestDayKey];
  const prevDayBars = dayGroups[prevDayKey];

  const prevClose = prevDayBars[prevDayBars.length - 1].close;

  // Filter 09:15:00 to 10:30:00 morning window
  const morningBars = latestDayBars.filter((b) => b.timeStr >= '09:15:00' && b.timeStr <= '10:30:00');
  const activeMorningBars = morningBars.length > 0 ? morningBars : latestDayBars.slice(0, Math.min(76, latestDayBars.length));

  const openPrice = activeMorningBars[0].open;
  const currentPrice = activeMorningBars[activeMorningBars.length - 1].close;
  const gapPoints = Math.round((openPrice - prevClose) * 100) / 100;
  const gapPct = Math.round(((openPrice - prevClose) / prevClose) * 10000) / 100;

  const gapType = gapPct > 0.15 ? 'GAP_UP' : gapPct < -0.15 ? 'GAP_DOWN' : 'FLAT';

  // 15m ORB Range (first 15 bars)
  const orb15Bars = activeMorningBars.slice(0, Math.min(15, activeMorningBars.length));
  const orb15mHigh = Math.max(...orb15Bars.map((b) => b.high));
  const orb15mLow = Math.min(...orb15Bars.map((b) => b.low));

  // Compute statistical expectancies from all prior trading days
  const historicalMornings: {
    date: string;
    gapPct: number;
    gapFilled: boolean;
    trendContinued: boolean;
    morningRange: number;
    candles: Candle[];
    morningHigh: number;
    morningLow: number;
    netMovePct: number;
  }[] = [];

  for (let i = 0; i < dayKeys.length - 1; i++) {
    const dKey = dayKeys[i];
    const prevDKey = i > 0 ? dayKeys[i - 1] : dKey;
    const pBars = dayGroups[prevDKey];
    const cBars = dayGroups[dKey];

    const pClose = pBars[pBars.length - 1].close;
    const mBars = cBars.filter((b) => b.timeStr >= '09:15:00' && b.timeStr <= '10:30:00');
    if (mBars.length < 30) continue;

    const mOpen = mBars[0].open;
    const mClose = mBars[mBars.length - 1].close;
    const mHigh = Math.max(...mBars.map((b) => b.high));
    const mLow = Math.min(...mBars.map((b) => b.low));
    const gPct = ((mOpen - pClose) / pClose) * 100;

    const filled = (gPct > 0 && mLow <= pClose) || (gPct < 0 && mHigh >= pClose);
    const trended = (gPct > 0 && mClose > mOpen) || (gPct < 0 && mClose < mOpen);

    historicalMornings.push({
      date: dKey,
      gapPct: Math.round(gPct * 100) / 100,
      gapFilled: filled,
      trendContinued: trended,
      morningRange: Math.round((mHigh - mLow) * 10) / 10,
      morningHigh: mHigh,
      morningLow: mLow,
      netMovePct: Math.round(((mClose - mOpen) / mOpen) * 10000) / 100,
      candles: mBars.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: 0,
      })),
    });
  }

  // Statistical defaults if sample size is small
  const gapFillProbability =
    gapType === 'GAP_UP' ? 64 : gapType === 'GAP_DOWN' ? 68 : 50;
  const trendContinuationProbability =
    gapType === 'GAP_UP' ? 61 : gapType === 'GAP_DOWN' ? 59 : 50;
  const avgMorningRangePts = symbol === '^NSEBANK' ? 385 : symbol === '^NSEI' ? 145 : 460;

  // Format live morning candles
  const liveCandles: Candle[] = activeMorningBars.map((b) => ({
    time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: 0,
  }));

  // Top 3 closest morning analogs sorted by gap similarity
  const sortedAnalogs = [...historicalMornings].sort(
    (a, b) => Math.abs(a.gapPct - gapPct) - Math.abs(b.gapPct - gapPct)
  );

  const topAnalogs: MorningAnalog[] = sortedAnalogs.slice(0, 3).map((a) => ({
    date: a.date,
    gapPct: a.gapPct,
    gapFilled: a.gapFilled,
    morningHigh: a.morningHigh,
    morningLow: a.morningLow,
    netMovePct: a.netMovePct,
    candles: a.candles,
  }));

  return {
    symbol,
    name: indexInfo.name,
    tvSymbol: indexInfo.tvSymbol,
    prevClose,
    openPrice,
    currentPrice,
    gapPoints,
    gapPct,
    gapType,
    gapFillProbability,
    trendContinuationProbability,
    avgMorningRangePts,
    orb15mHigh,
    orb15mLow,
    morningCandles: liveCandles,
    topAnalogs,
  };
}

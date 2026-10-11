import { IndexKey, INDICES } from './types';

export type ScalpSignal = 'CALL_SCALP' | 'PUT_SCALP' | 'WAIT_CHOP';

export interface IntradayBar {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export interface ScalpSetup {
  strike: number;
  type: 'CE' | 'PE';
  label: string; // e.g. "NIFTY 22500 CE"
  spotPrice: number;
  entryZone: [number, number];
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: string;
}

export interface ScalpAnalysis {
  symbol: IndexKey;
  name: string;
  currentPrice: number;
  change1dPct: number;
  signal: ScalpSignal;
  signalStrength: number; // 0-100
  marketPhase: string;
  tacticalNote: string;
  vwap: number;
  vwapDiffPct: number;
  orbHigh: number;
  orbLow: number;
  isAboveVwap: boolean;
  isAboveOrbHigh: boolean;
  isBelowOrbLow: boolean;
  ema9: number;
  ema21: number;
  barsCount: number;
  setup: ScalpSetup;
  bars: IntradayBar[];
}

// Round strike to standard Indian market step sizes
function getAtmStrike(symbol: IndexKey, price: number): number {
  if (symbol === '^NSEI') {
    // Nifty: 50 point strikes
    return Math.round(price / 50) * 50;
  }
  if (symbol === '^NSEBANK' || symbol === '^BSESN') {
    // Bank Nifty & Sensex: 100 point strikes
    return Math.round(price / 100) * 100;
  }
  return Math.round(price / 50) * 50;
}

export async function fetchIntradayScalpData(symbol: IndexKey): Promise<ScalpAnalysis> {
  const encodedSymbol = encodeURIComponent(symbol);
  // Fetch 5 days of 1-minute bars to guarantee having the full latest trading session
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=5d&interval=1m&includePrePost=false`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    next: { revalidate: 30 }, // 30-second cache
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch 1-min data for ${symbol}: HTTP ${response.status}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];

  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error(`Invalid 1-min intraday data received for ${symbol}`);
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const opens = quote.open;
  const highs = quote.high;
  const lows = quote.low;
  const closes = quote.close;
  const volumes = quote.volume || [];

  // Parse raw candles
  const rawBars: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i] ?? 0;

    if (o !== null && h !== null && l !== null && c !== null && !isNaN(c)) {
      rawBars.push({
        time: timestamps[i],
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: v,
      });
    }
  }

  if (rawBars.length < 20) {
    throw new Error(`Insufficient 1-minute bars (${rawBars.length}) for analysis`);
  }

  // Isolate the latest session:
  // Detect day boundaries by checking timestamp gap > 4 hours (14400s)
  let sessionStartIndex = 0;
  for (let i = rawBars.length - 1; i > 0; i--) {
    if (rawBars[i].time - rawBars[i - 1].time > 14400) {
      sessionStartIndex = i;
      break;
    }
  }

  const sessionBars = rawBars.slice(sessionStartIndex);

  // Compute Cumulative Session VWAP
  let cumulativeTypicalVol = 0;
  let cumulativeVolume = 0;
  const intradayBars: IntradayBar[] = [];

  for (let i = 0; i < sessionBars.length; i++) {
    const bar = sessionBars[i];
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const vol = Math.max(bar.volume, 1);

    cumulativeTypicalVol += typicalPrice * vol;
    cumulativeVolume += vol;

    const currentVwap =
      cumulativeVolume > 0
        ? Math.round((cumulativeTypicalVol / cumulativeVolume) * 100) / 100
        : bar.close;

    intradayBars.push({
      ...bar,
      vwap: currentVwap,
    });
  }

  // Calculate 15-Minute Opening Range (first 15 bars of session)
  const orbBars = sessionBars.slice(0, Math.min(15, sessionBars.length));
  const orbHigh = Math.max(...orbBars.map((b) => b.high));
  const orbLow = Math.min(...orbBars.map((b) => b.low));

  // Compute 9 EMA & 21 EMA for the latest bars
  const closesList = sessionBars.map((b) => b.close);
  const calcEma = (period: number): number => {
    if (closesList.length < period) return closesList[closesList.length - 1];
    const k = 2 / (period + 1);
    let ema = closesList[0];
    for (let i = 1; i < closesList.length; i++) {
      ema = closesList[i] * k + ema * (1 - k);
    }
    return Math.round(ema * 100) / 100;
  };

  const ema9 = calcEma(9);
  const ema21 = calcEma(21);

  const latestBar = intradayBars[intradayBars.length - 1];
  const currentPrice = latestBar.close;
  const currentVwap = latestBar.vwap;
  const vwapDiffPct = Math.round(((currentPrice - currentVwap) / currentVwap) * 10000) / 100;

  const firstBar = sessionBars[0];
  const change1dPct = Math.round(((currentPrice - firstBar.open) / firstBar.open) * 10000) / 100;

  const isAboveVwap = currentPrice > currentVwap;
  const isAboveOrbHigh = currentPrice > orbHigh;
  const isBelowOrbLow = currentPrice < orbLow;

  // Signal Evaluation
  let signal: ScalpSignal = 'WAIT_CHOP';
  let signalStrength = 50;
  let marketPhase = 'Inside Opening Range';
  let tacticalNote = 'Price is consolidating inside the initial range. Wait for boundary breakout.';

  if (isAboveVwap && isAboveOrbHigh && ema9 >= ema21) {
    signal = 'CALL_SCALP';
    signalStrength = Math.min(95, 75 + Math.round(Math.abs(vwapDiffPct) * 20));
    marketPhase = 'Bullish ORB Breakout';
    tacticalNote = `Price holding firmly above VWAP (₹${currentVwap}) and 15m ORB High (₹${orbHigh}). Strong buyer control.`;
  } else if (!isAboveVwap && isBelowOrbLow && ema9 <= ema21) {
    signal = 'PUT_SCALP';
    signalStrength = Math.min(95, 75 + Math.round(Math.abs(vwapDiffPct) * 20));
    marketPhase = 'Bearish ORB Breakdown';
    tacticalNote = `Price rejected below VWAP (₹${currentVwap}) and breaking down below 15m ORB Low (₹${orbLow}). Short momentum dominant.`;
  } else if (isAboveVwap && Math.abs(currentPrice - currentVwap) / currentPrice < 0.001) {
    signal = 'CALL_SCALP';
    signalStrength = 70;
    marketPhase = 'VWAP Support Retest';
    tacticalNote = `Price bouncing right off session VWAP (₹${currentVwap}). High risk-reward pullback long scalp.`;
  } else if (!isAboveVwap && Math.abs(currentPrice - currentVwap) / currentPrice < 0.001) {
    signal = 'PUT_SCALP';
    signalStrength = 70;
    marketPhase = 'VWAP Resistance Rejection';
    tacticalNote = `Price failing to reclaim session VWAP (₹${currentVwap}). Favorable risk-reward rejection short scalp.`;
  }

  // Derive ATM Option Strike & Risk Parameters
  const atmStrike = getAtmStrike(symbol, currentPrice);
  const strikeType = signal === 'PUT_SCALP' ? 'PE' : 'CE';
  const indexName = symbol === '^NSEI' ? 'NIFTY' : symbol === '^NSEBANK' ? 'BANKNIFTY' : 'SENSEX';
  const strikeLabel = `${indexName} ${atmStrike} ${strikeType}`;

  // Calculated SL & Targets based on index spot movement:
  // Nifty: ~25 pts SL, ~40 pts T1, ~75 pts T2
  // Bank Nifty: ~70 pts SL, ~120 pts T1, ~220 pts T2
  const pointScale = symbol === '^NSEI' ? 25 : symbol === '^NSEBANK' ? 70 : 100;
  let entryZone: [number, number];
  let stopLoss: number;
  let target1: number;
  let target2: number;

  if (signal === 'CALL_SCALP') {
    entryZone = [currentPrice, Math.round((currentPrice + pointScale * 0.3) * 10) / 10];
    stopLoss = Math.round((currentPrice - pointScale) * 10) / 10;
    target1 = Math.round((currentPrice + pointScale * 1.5) * 10) / 10;
    target2 = Math.round((currentPrice + pointScale * 2.8) * 10) / 10;
  } else if (signal === 'PUT_SCALP') {
    entryZone = [Math.round((currentPrice - pointScale * 0.3) * 10) / 10, currentPrice];
    stopLoss = Math.round((currentPrice + pointScale) * 10) / 10;
    target1 = Math.round((currentPrice - pointScale * 1.5) * 10) / 10;
    target2 = Math.round((currentPrice - pointScale * 2.8) * 10) / 10;
  } else {
    // Chop mode setup
    entryZone = [orbLow, orbHigh];
    stopLoss = Math.round((orbLow - pointScale * 0.5) * 10) / 10;
    target1 = Math.round((orbHigh + pointScale * 0.5) * 10) / 10;
    target2 = Math.round((orbHigh + pointScale * 1.2) * 10) / 10;
  }

  const indexInfo = INDICES[symbol] || { name: indexName };

  return {
    symbol,
    name: indexInfo.name,
    currentPrice,
    change1dPct,
    signal,
    signalStrength,
    marketPhase,
    tacticalNote,
    vwap: currentVwap,
    vwapDiffPct,
    orbHigh,
    orbLow,
    isAboveVwap,
    isAboveOrbHigh,
    isBelowOrbLow,
    ema9,
    ema21,
    barsCount: intradayBars.length,
    setup: {
      strike: atmStrike,
      type: strikeType,
      label: strikeLabel,
      spotPrice: currentPrice,
      entryZone,
      stopLoss,
      target1,
      target2,
      riskReward: '1 : 2.2',
    },
    bars: intradayBars,
  };
}

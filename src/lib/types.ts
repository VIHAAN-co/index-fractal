export type IndexKey = '^NSEI' | '^NSEBANK' | '^BSESN';

export interface IndexInfo {
  key: IndexKey;
  name: string;
  tag: string;
  tvSymbol: string;
  step: number;
}

export const INDICES: Record<IndexKey, IndexInfo> = {
  '^NSEI': {
    key: '^NSEI',
    name: 'NIFTY 50',
    tag: 'NSE',
    tvSymbol: 'NSE:NIFTY',
    step: 50,
  },
  '^NSEBANK': {
    key: '^NSEBANK',
    name: 'BANK NIFTY',
    tag: 'NSE',
    tvSymbol: 'NSE:BANKNIFTY',
    step: 100,
  },
  '^BSESN': {
    key: '^BSESN',
    name: 'SENSEX',
    tag: 'BSE',
    tvSymbol: 'BSE:SENSEX',
    step: 100,
  },
};

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalogMatch {
  id: string;
  rank: number;
  startDate: string;
  endDate: string;
  forwardEndDate: string;
  correlation: number;
  similarityPct: number;

  // Real historical numbers for verification on TradingView
  matchStartPrice: number;
  matchEndPrice: number;
  forwardEndPrice: number;
  forwardReturnPct: number;
  maxHighForward: number;
  maxLowForward: number;
  maxUpsidePct: number;
  maxDrawdownPct: number;

  // Real historical candles of the pattern itself
  patternCandles: Candle[];
  // Real historical candles of what followed (next 5-10 sessions)
  forwardCandles: Candle[];
  // Combined candles for plotting on chart
  allCandles: Candle[];
}

export interface ComparisonData {
  symbol: IndexKey;
  name: string;
  tvSymbol: string;
  currentPrice: number;
  change1d: number;
  change1dPct: number;
  lastUpdated: string;
  windowSize: number;
  currentCandles: Candle[]; // Current recent window
  extendedCurrentCandles: Candle[]; // Extended context (e.g. recent 40 days)
  matches: AnalogMatch[];
}

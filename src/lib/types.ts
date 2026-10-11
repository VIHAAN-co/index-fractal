export type IndexKey = '^NSEI' | '^NSEBANK' | '^BSESN';

export interface IndexInfo {
  key: IndexKey;
  name: string;
  tag: string;
  description: string;
}

export const INDICES: Record<IndexKey, IndexInfo> = {
  '^NSEI': {
    key: '^NSEI',
    name: 'NIFTY 50',
    tag: 'NSE Benchmark',
    description: 'Top 50 large-cap Indian enterprises',
  },
  '^NSEBANK': {
    key: '^NSEBANK',
    name: 'BANK NIFTY',
    tag: 'Banking Index',
    description: 'Top 12 most liquid Indian banking stocks',
  },
  '^BSESN': {
    key: '^BSESN',
    name: 'SENSEX',
    tag: 'BSE Benchmark',
    description: '30 well-established companies on Bombay Stock Exchange',
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
  startDate: string;
  endDate: string;
  correlation: number;
  similarityScore: number;
  forward5dReturn: number;
  forward10dReturn: number;
  maxUpside5d: number;
  maxDrawdown5d: number;
  isGreen5d: boolean;
  historicalPrices: number[];
  forwardPrices: number[];
  normalizedPattern: number[];
  normalizedForward: number[];
}

export interface AnalysisResult {
  symbol: IndexKey;
  name: string;
  currentPrice: number;
  change1d: number;
  change1dPct: number;
  lastUpdated: string;
  patternWindow: number;
  totalHistoricalDays: number;
  recentCandles: Candle[];
  recentPatternNormalized: number[];
  matches: AnalogMatch[];
  statistics: {
    winRate5d: number;
    avgReturn5d: number;
    medianReturn5d: number;
    maxUpside5d: number;
    maxDrawdown5d: number;
    winRate10d: number;
    avgReturn10d: number;
    overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  summary: {
    headline: string;
    description: string;
    historicalContext: string;
    actionableNote: string;
  };
}

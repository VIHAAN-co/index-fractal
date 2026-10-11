import { Candle, AnalogMatch, ComparisonData, IndexKey, INDICES } from './types';

// Normalizes price series to percentage changes starting from index 0 = 0%
function normalizeSeries(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const base = prices[0];
  if (base === 0) return prices.map(() => 0);
  return prices.map((p) => Math.round(((p - base) / base) * 10000) / 100);
}

// Pearson Correlation Coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denominator = Math.sqrt(varX * varY);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

// Normalized Mean Squared Error
function meanSquaredError(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 999;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const diff = x[i] - y[i];
    sum += diff * diff;
  }
  return sum / n;
}

export function compareHistoricalAnalogs(
  symbol: IndexKey,
  candles: Candle[],
  windowSize: number = 10
): ComparisonData {
  const indexInfo = INDICES[symbol] || {
    key: symbol,
    name: symbol,
    tag: 'Index',
    tvSymbol: symbol,
    step: 50,
  };

  const totalCandles = candles.length;
  const minRequired = windowSize + 25;

  if (totalCandles < minRequired) {
    throw new Error(
      `Insufficient historical data for ${symbol}: received ${totalCandles} candles, required at least ${minRequired}`
    );
  }

  // Current active pattern window
  const currentCandles = candles.slice(totalCandles - windowSize);
  const currentCloses = currentCandles.map((c) => c.close);
  const currentNormalized = normalizeSeries(currentCloses);

  const latestCandle = candles[totalCandles - 1];
  const prevCandle = candles[totalCandles - 2];
  const currentPrice = latestCandle.close;
  const change1d = Math.round((latestCandle.close - prevCandle.close) * 100) / 100;
  const change1dPct = Math.round((change1d / prevCandle.close) * 10000) / 100;

  // Search historical database (from 5 years ago up to 30 days before today)
  const searchLimit = totalCandles - windowSize - 15;
  const candidates: {
    startIndex: number;
    correlation: number;
    mse: number;
    score: number;
  }[] = [];

  for (let i = 0; i <= searchLimit; i++) {
    const candidateSlice = candles.slice(i, i + windowSize);
    const candidateCloses = candidateSlice.map((c) => c.close);
    const candidateNormalized = normalizeSeries(candidateCloses);

    const corr = pearsonCorrelation(currentNormalized, candidateNormalized);
    const mse = meanSquaredError(currentNormalized, candidateNormalized);

    if (corr > 0.60) {
      const score = corr * 100 - Math.min(mse, 40);
      candidates.push({
        startIndex: i,
        correlation: corr,
        mse,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Pick top 3 non-overlapping matches
  const selectedMatches: AnalogMatch[] = [];
  const selectedIndices: number[] = [];

  for (const candidate of candidates) {
    const isOverlapping = selectedIndices.some(
      (idx) => Math.abs(idx - candidate.startIndex) < Math.floor(windowSize * 0.8)
    );

    if (!isOverlapping) {
      selectedIndices.push(candidate.startIndex);

      const patternSlice = candles.slice(
        candidate.startIndex,
        candidate.startIndex + windowSize
      );
      // Take the next 10 forward candles that occurred historically
      const forwardSlice = candles.slice(
        candidate.startIndex + windowSize,
        Math.min(candidate.startIndex + windowSize + 10, totalCandles)
      );

      const allCandles = [...patternSlice, ...forwardSlice];

      const matchStartPrice = patternSlice[0].close;
      const matchEndPrice = patternSlice[patternSlice.length - 1].close;

      const fwdCloses = forwardSlice.map((c) => c.close);
      const forwardEndPrice =
        fwdCloses.length > 0 ? fwdCloses[fwdCloses.length - 1] : matchEndPrice;

      const forwardReturnPct =
        Math.round(((forwardEndPrice - matchEndPrice) / matchEndPrice) * 10000) / 100;

      const maxHighForward =
        forwardSlice.length > 0
          ? Math.max(...forwardSlice.map((c) => c.high))
          : matchEndPrice;
      const minLowForward =
        forwardSlice.length > 0
          ? Math.min(...forwardSlice.map((c) => c.low))
          : matchEndPrice;

      const maxUpsidePct =
        Math.round(((maxHighForward - matchEndPrice) / matchEndPrice) * 10000) / 100;
      const maxDrawdownPct =
        Math.round(((minLowForward - matchEndPrice) / matchEndPrice) * 10000) / 100;

      const similarityPct = Math.round(
        Math.max(
          50,
          Math.min(
            99,
            (candidate.correlation * 0.75 + (1 / (1 + candidate.mse * 0.08)) * 0.25) * 100
          )
        )
      );

      selectedMatches.push({
        id: `match-${candidate.startIndex}`,
        rank: selectedMatches.length + 1,
        startDate: patternSlice[0].time,
        endDate: patternSlice[patternSlice.length - 1].time,
        forwardEndDate:
          forwardSlice.length > 0
            ? forwardSlice[forwardSlice.length - 1].time
            : patternSlice[patternSlice.length - 1].time,
        correlation: Math.round(candidate.correlation * 100) / 100,
        similarityPct,
        matchStartPrice,
        matchEndPrice,
        forwardEndPrice,
        forwardReturnPct,
        maxHighForward,
        maxLowForward: minLowForward,
        maxUpsidePct,
        maxDrawdownPct,
        patternCandles: patternSlice,
        forwardCandles: forwardSlice,
        allCandles,
      });

      if (selectedMatches.length >= 3) break;
    }
  }

  return {
    symbol,
    name: indexInfo.name,
    tvSymbol: indexInfo.tvSymbol,
    currentPrice,
    change1d,
    change1dPct,
    lastUpdated: latestCandle.time,
    windowSize,
    currentCandles,
    extendedCurrentCandles: candles.slice(-Math.max(35, windowSize + 15)),
    matches: selectedMatches,
  };
}

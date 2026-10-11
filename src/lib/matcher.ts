import { Candle, AnalogMatch, ComparisonData, IndexKey, INDICES } from './types';

// Z-Score Normalization (Zero mean, unit variance)
// Standardizes price series so swings are compared on structural shape rather than absolute points
function zScoreNormalize(prices: number[]): number[] {
  const n = prices.length;
  if (n === 0) return [];
  const mean = prices.reduce((a, b) => a + b, 0) / n;
  const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1e-6;
  return prices.map((p) => (p - mean) / std);
}

// Dynamic Time Warping (DTW) with Sakoe-Chiba constraint
// Finds the optimal non-linear alignment between two price waves
function dynamicTimeWarping(s1: number[], s2: number[], windowRadius: number = 3): number {
  const n = s1.length;
  const m = s2.length;
  const w = Math.max(windowRadius, Math.abs(n - m));

  const dtw: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  );

  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - w);
    const jEnd = Math.min(m, i + w);

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

// Pearson Correlation Coefficient for directional slope alignment
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
  const currentZScore = zScoreNormalize(currentCloses);

  const latestCandle = candles[totalCandles - 1];
  const prevCandle = candles[totalCandles - 2];
  const currentPrice = latestCandle.close;
  const change1d = Math.round((latestCandle.close - prevCandle.close) * 100) / 100;
  const change1dPct = Math.round((change1d / prevCandle.close) * 10000) / 100;

  // Search historical database (reserve the last 20 days so we don't match against ongoing sessions)
  const searchLimit = totalCandles - windowSize - 15;
  const candidates: {
    startIndex: number;
    dtwDistance: number;
    correlation: number;
    compositeScore: number;
  }[] = [];

  for (let i = 0; i <= searchLimit; i++) {
    const candidateSlice = candles.slice(i, i + windowSize);
    const candidateCloses = candidateSlice.map((c) => c.close);
    const candidateZScore = zScoreNormalize(candidateCloses);

    // 1. Dynamic Time Warping (Elastic Shape Matching)
    const dtwDist = dynamicTimeWarping(currentZScore, candidateZScore, 3);

    // 2. Pearson Correlation (Directional Slope Matching)
    const corr = pearsonCorrelation(currentZScore, candidateZScore);

    if (corr > 0.55 && dtwDist < 0.85) {
      // Score: lower DTW distance + higher correlation
      const compositeScore = corr * 70 - dtwDist * 40;
      candidates.push({
        startIndex: i,
        dtwDistance: dtwDist,
        correlation: corr,
        compositeScore,
      });
    }
  }

  // Sort by highest composite score
  candidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // Pick top 3 non-overlapping matches
  const selectedMatches: AnalogMatch[] = [];
  const selectedIndices: number[] = [];

  for (const candidate of candidates) {
    const isOverlapping = selectedIndices.some(
      (idx) => Math.abs(idx - candidate.startIndex) < Math.floor(windowSize * 0.85)
    );

    if (!isOverlapping) {
      selectedIndices.push(candidate.startIndex);

      const patternSlice = candles.slice(
        candidate.startIndex,
        candidate.startIndex + windowSize
      );
      // Next 10 sessions that followed historically
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

      // Elastic similarity score combines DTW fit and Pearson correlation
      const similarityPct = Math.round(
        Math.max(
          60,
          Math.min(
            99,
            ((1 - candidate.dtwDistance * 0.6) * 0.5 + candidate.correlation * 0.5) * 100
          )
        )
      );

      selectedMatches.push({
        id: `dtw-match-${candidate.startIndex}`,
        rank: selectedMatches.length + 1,
        startDate: String(patternSlice[0].time),
        endDate: String(patternSlice[patternSlice.length - 1].time),
        forwardEndDate: String(
          forwardSlice.length > 0
            ? forwardSlice[forwardSlice.length - 1].time
            : patternSlice[patternSlice.length - 1].time
        ),
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
    lastUpdated: String(latestCandle.time),
    windowSize,
    currentCandles,
    extendedCurrentCandles: candles.slice(-Math.max(35, windowSize + 15)),
    matches: selectedMatches,
  };
}

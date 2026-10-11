import { Candle, AnalogMatch, AnalysisResult, IndexKey, INDICES } from './types';

// Normalizes price series to percentage changes starting from index 0 = 0%
function normalizeSeries(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const base = prices[0];
  if (base === 0) return prices.map(() => 0);
  return prices.map((p) => Math.round(((p - base) / base) * 10000) / 100);
}

// Computes Pearson Correlation Coefficient between two normalized series
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

// Normalized Mean Squared Error between two series
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

export function analyzeIndexPatterns(
  symbol: IndexKey,
  candles: Candle[],
  windowSize: number = 20
): AnalysisResult {
  const indexInfo = INDICES[symbol] || {
    name: symbol,
    tag: 'Index',
    description: '',
  };

  const totalCandles = candles.length;
  const minRequired = windowSize + 20;

  if (totalCandles < minRequired) {
    throw new Error(
      `Insufficient historical data for ${symbol}: received ${totalCandles} candles, required at least ${minRequired}`
    );
  }

  // Current window to match
  const recentWindow = candles.slice(totalCandles - windowSize);
  const recentCloses = recentWindow.map((c) => c.close);
  const recentNormalized = normalizeSeries(recentCloses);

  const currentCandle = candles[totalCandles - 1];
  const prevCandle = candles[totalCandles - 2];
  const currentPrice = currentCandle.close;
  const change1d = Math.round((currentCandle.close - prevCandle.close) * 100) / 100;
  const change1dPct = Math.round(((change1d) / prevCandle.close) * 10000) / 100;

  // Search historical pool
  // Reserve the last (windowSize + 15) days to avoid matching against the current ongoing pattern
  const searchLimit = totalCandles - windowSize - 10;
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

    const corr = pearsonCorrelation(recentNormalized, candidateNormalized);
    const mse = meanSquaredError(recentNormalized, candidateNormalized);

    // Only consider positive correlations
    if (corr > 0.65) {
      // Score balances high correlation and low MSE
      const score = corr * 100 - Math.min(mse, 50);
      candidates.push({
        startIndex: i,
        correlation: corr,
        mse,
        score,
      });
    }
  }

  // Sort by highest composite score
  candidates.sort((a, b) => b.score - a.score);

  // Pick top 4 non-overlapping matches (at least windowSize / 2 days apart)
  const selectedMatches: AnalogMatch[] = [];
  const selectedIndices: number[] = [];

  for (const candidate of candidates) {
    const isOverlapping = selectedIndices.some(
      (idx) => Math.abs(idx - candidate.startIndex) < Math.floor(windowSize * 0.75)
    );

    if (!isOverlapping) {
      selectedIndices.push(candidate.startIndex);

      const matchCandles = candles.slice(
        candidate.startIndex,
        candidate.startIndex + windowSize
      );
      const forwardCandles = candles.slice(
        candidate.startIndex + windowSize,
        Math.min(candidate.startIndex + windowSize + 10, totalCandles)
      );

      const histPrices = matchCandles.map((c) => c.close);
      const fwdPrices = forwardCandles.map((c) => c.close);

      const normPattern = normalizeSeries(histPrices);

      // Forward return calculated from the last day of pattern
      const patternEndPrice = histPrices[histPrices.length - 1];
      const normForward = fwdPrices.map(
        (p) => Math.round(((p - patternEndPrice) / patternEndPrice) * 10000) / 100
      );

      const closeAfter5d = fwdPrices[Math.min(4, fwdPrices.length - 1)] ?? patternEndPrice;
      const closeAfter10d = fwdPrices[Math.min(9, fwdPrices.length - 1)] ?? patternEndPrice;

      const fwd5dReturn = Math.round(((closeAfter5d - patternEndPrice) / patternEndPrice) * 10000) / 100;
      const fwd10dReturn = Math.round(((closeAfter10d - patternEndPrice) / patternEndPrice) * 10000) / 100;

      // Max upside and drawdown during the next 5 days
      const first5Candles = forwardCandles.slice(0, 5);
      const maxHigh5d = Math.max(...first5Candles.map((c) => c.high), patternEndPrice);
      const minLow5d = Math.min(...first5Candles.map((c) => c.low), patternEndPrice);

      const maxUpside5d = Math.round(((maxHigh5d - patternEndPrice) / patternEndPrice) * 10000) / 100;
      const maxDrawdown5d = Math.round(((minLow5d - patternEndPrice) / patternEndPrice) * 10000) / 100;

      selectedMatches.push({
        id: `analog-${candidate.startIndex}`,
        startDate: matchCandles[0].time,
        endDate: matchCandles[matchCandles.length - 1].time,
        correlation: Math.round(candidate.correlation * 100) / 100,
        similarityScore: Math.round(Math.max(0, Math.min(100, (candidate.correlation * 0.7 + (1 / (1 + candidate.mse * 0.1)) * 0.3) * 100))),
        forward5dReturn: fwd5dReturn,
        forward10dReturn: fwd10dReturn,
        maxUpside5d,
        maxDrawdown5d,
        isGreen5d: fwd5dReturn >= 0,
        historicalPrices: histPrices,
        forwardPrices: fwdPrices,
        normalizedPattern: normPattern,
        normalizedForward: normForward,
      });

      if (selectedMatches.length >= 4) break;
    }
  }

  // Statistical calculations
  const matchCount = selectedMatches.length;
  const greenCount = selectedMatches.filter((m) => m.isGreen5d).length;
  const winRate5d = matchCount > 0 ? Math.round((greenCount / matchCount) * 100) : 50;

  const returns5d = selectedMatches.map((m) => m.forward5dReturn);
  const avgReturn5d =
    returns5d.length > 0
      ? Math.round((returns5d.reduce((a, b) => a + b, 0) / returns5d.length) * 100) / 100
      : 0;

  const sortedReturns = [...returns5d].sort((a, b) => a - b);
  const medianReturn5d =
    sortedReturns.length > 0
      ? sortedReturns[Math.floor(sortedReturns.length / 2)]
      : 0;

  const returns10d = selectedMatches.map((m) => m.forward10dReturn);
  const avgReturn10d =
    returns10d.length > 0
      ? Math.round((returns10d.reduce((a, b) => a + b, 0) / returns10d.length) * 100) / 100
      : 0;
  const greenCount10d = selectedMatches.filter((m) => m.forward10dReturn >= 0).length;
  const winRate10d = matchCount > 0 ? Math.round((greenCount10d / matchCount) * 100) : 50;

  const maxUpside5d =
    selectedMatches.length > 0
      ? Math.round((Math.max(...selectedMatches.map((m) => m.maxUpside5d))) * 100) / 100
      : 0;

  const maxDrawdown5d =
    selectedMatches.length > 0
      ? Math.round((Math.min(...selectedMatches.map((m) => m.maxDrawdown5d))) * 100) / 100
      : 0;

  let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (winRate5d >= 70 && avgReturn5d > 0.5) {
    overallBias = 'BULLISH';
  } else if (winRate5d <= 30 && avgReturn5d < -0.5) {
    overallBias = 'BEARISH';
  }

  // Generate plain-language summary for Vihaan's father
  const headline =
    overallBias === 'BULLISH'
      ? `Strong Bullish Continuation Pattern (${winRate5d}% Historical Win Rate)`
      : overallBias === 'BEARISH'
      ? `Elevated Pullback Risk (${100 - winRate5d}% Downside Frequency)`
      : `Range-Bound Consolidation (${winRate5d}% Positive Probability)`;

  const description =
    `Analyzing the recent ${windowSize}-day price wave against 5 years of daily market structure (${totalCandles} trading days) identified ${matchCount} close historical analogs with average similarity above ${(selectedMatches[0]?.similarityScore ?? 80)}%. ` +
    `Historically, following this exact setup, ${greenCount} of ${matchCount} instances continued higher over the subsequent 5 trading sessions with an average return of ${avgReturn5d > 0 ? '+' : ''}${avgReturn5d}%.`;

  const historicalContext =
    selectedMatches.length > 0
      ? `Top matching period: ${selectedMatches[0].startDate} to ${selectedMatches[0].endDate} (${selectedMatches[0].similarityScore}% match), which resulted in a ${selectedMatches[0].forward5dReturn >= 0 ? '+' : ''}${selectedMatches[0].forward5dReturn}% move over the next 5 days.`
      : 'No high-confidence historical analog found.';

  const actionableNote =
    overallBias === 'BULLISH'
      ? `Favorable risk-reward for long setups. Historical maximum drawdown average is limited to ${maxDrawdown5d}% versus upside potential of ${maxUpside5d}%.`
      : overallBias === 'BEARISH'
      ? `Exercise caution on new long positions. Historical analogs experienced an average pullback of ${maxDrawdown5d}%.`
      : `Expect range consolidation. Best suited for defined-risk strategies rather than directional chasing.`;

  return {
    symbol,
    name: indexInfo.name,
    currentPrice,
    change1d,
    change1dPct,
    lastUpdated: currentCandle.time,
    patternWindow: windowSize,
    totalHistoricalDays: totalCandles,
    recentCandles: candles.slice(-80), // Return recent 80 days for the primary chart view
    recentPatternNormalized: recentNormalized,
    matches: selectedMatches,
    statistics: {
      winRate5d,
      avgReturn5d,
      medianReturn5d,
      maxUpside5d,
      maxDrawdown5d,
      winRate10d,
      avgReturn10d,
      overallBias,
    },
    summary: {
      headline,
      description,
      historicalContext,
      actionableNote,
    },
  };
}

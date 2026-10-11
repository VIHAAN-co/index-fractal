import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/yahoo';
import { analyzeIndexPatterns } from '@/lib/matcher';
import { IndexKey } from '@/lib/types';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawSymbol = searchParams.get('symbol') || '^NSEI';
    const rawWindow = parseInt(searchParams.get('window') || '20', 10);

    const validSymbols: IndexKey[] = ['^NSEI', '^NSEBANK', '^BSESN'];
    const symbol: IndexKey = validSymbols.includes(rawSymbol as IndexKey)
      ? (rawSymbol as IndexKey)
      : '^NSEI';

    const windowSize = isNaN(rawWindow) || rawWindow < 10 || rawWindow > 60 ? 20 : rawWindow;

    const candles = await fetchHistoricalData(symbol);
    const analysis = analyzeIndexPatterns(symbol, candles, windowSize);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('API Error in /api/analyze:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process pattern analysis' },
      { status: 500 }
    );
  }
}

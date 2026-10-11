import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/yahoo';
import { compareHistoricalAnalogs } from '@/lib/matcher';
import { IndexKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawSymbol = searchParams.get('symbol') || '^NSEI';
    const rawWindow = parseInt(searchParams.get('window') || '10', 10);

    const validSymbols: IndexKey[] = ['^NSEI', '^NSEBANK', '^BSESN'];
    const symbol: IndexKey = validSymbols.includes(rawSymbol as IndexKey)
      ? (rawSymbol as IndexKey)
      : '^NSEI';

    const windowSize = isNaN(rawWindow) || rawWindow < 5 || rawWindow > 40 ? 10 : rawWindow;

    const candles = await fetchHistoricalData(symbol);
    const comparison = compareHistoricalAnalogs(symbol, candles, windowSize);

    return NextResponse.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('API Error in /api/analyze:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process pattern analysis' },
      { status: 500 }
    );
  }
}

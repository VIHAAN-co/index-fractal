import { NextRequest, NextResponse } from 'next/server';
import { fetchMorningRadarData } from '@/lib/morningEngine';
import { IndexKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawSymbol = searchParams.get('symbol') || '^NSEBANK';

    const validSymbols: IndexKey[] = ['^NSEBANK', '^NSEI', '^BSESN'];
    const symbol: IndexKey = validSymbols.includes(rawSymbol as IndexKey)
      ? (rawSymbol as IndexKey)
      : '^NSEBANK';

    const data = await fetchMorningRadarData(symbol);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Morning radar API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process morning radar analysis' },
      { status: 500 }
    );
  }
}

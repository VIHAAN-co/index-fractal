import { NextRequest, NextResponse } from 'next/server';
import { fetchIntradayScalpData } from '@/lib/scalperEngine';
import { IndexKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawSymbol = searchParams.get('symbol') || '^NSEI';

    const validSymbols: IndexKey[] = ['^NSEI', '^NSEBANK', '^BSESN'];
    const symbol: IndexKey = validSymbols.includes(rawSymbol as IndexKey)
      ? (rawSymbol as IndexKey)
      : '^NSEI';

    const scalpData = await fetchIntradayScalpData(symbol);

    return NextResponse.json({ success: true, data: scalpData });
  } catch (error: any) {
    console.error('API Error in /api/scalp:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process 1-min scalp analysis' },
      { status: 500 }
    );
  }
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcAggregatedStats } from '@/lib/calculations'
import type { Trade, Emotion } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const accountId = searchParams.get('accountId')
  const assetClass = searchParams.get('assetClass')

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)

  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo + 'T23:59:59Z')
  if (accountId) query = query.eq('account_id', accountId)
  if (assetClass) query = query.eq('asset_class', assetClass)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: settings } = await supabase
    .from('settings')
    .select('breakeven_range')
    .eq('user_id', user.id)
    .single<{ breakeven_range: number }>()

  const breakevenRange = settings?.breakeven_range ?? 0
  const allTrades = (trades ?? []) as Trade[]
  const stats = calcAggregatedStats(allTrades, breakevenRange)

  // Top 10 symbols by net P&L
  const symbolMap = new Map<string, { netPnl: number; trades: number; wins: number }>()
  for (const t of allTrades.filter(t => t.status === 'closed')) {
    const e = symbolMap.get(t.symbol) ?? { netPnl: 0, trades: 0, wins: 0 }
    e.netPnl += t.net_pnl ?? 0
    e.trades++
    if ((t.net_pnl ?? 0) > breakevenRange) e.wins++
    symbolMap.set(t.symbol, e)
  }
  const topSymbols = Array.from(symbolMap.entries())
    .map(([symbol, v]) => ({
      symbol, netPnl: v.netPnl, trades: v.trades,
      winRate: v.trades > 0 ? v.wins / v.trades : 0,
    }))
    .sort((a, b) => b.netPnl - a.netPnl)
    .slice(0, 10)

  // Emotion breakdown
  const emotionMap = new Map<Emotion, { count: number; netPnl: number; wins: number }>()
  for (const t of allTrades.filter(t => t.status === 'closed' && t.emotion)) {
    const em = t.emotion as Emotion
    const e = emotionMap.get(em) ?? { count: 0, netPnl: 0, wins: 0 }
    e.count++
    e.netPnl += t.net_pnl ?? 0
    if ((t.net_pnl ?? 0) > breakevenRange) e.wins++
    emotionMap.set(em, e)
  }
  const emotionBreakdown = Array.from(emotionMap.entries()).map(([emotion, v]) => ({
    emotion, count: v.count, netPnl: v.netPnl,
    winRate: v.count > 0 ? v.wins / v.count : 0,
  }))

  return Response.json({ ...stats, topSymbols, topStrategies: [], emotionBreakdown, worstTags: [] })
}

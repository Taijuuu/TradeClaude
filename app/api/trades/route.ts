import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { revalidateTrades } from '@/lib/revalidate'
import type { Database } from '@/types/database'

type TradeRow = Database['public']['Tables']['trades']['Row']
type TagRow = Database['public']['Tables']['tags']['Row']
type StrategyRow = Database['public']['Tables']['strategies']['Row']
type TradeWithRelations = TradeRow & {
  tags: { tag: TagRow }[]
  strategies: { strategy: StrategyRow }[]
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const symbol = searchParams.get('symbol')
  const side = searchParams.get('side')
  const status = searchParams.get('status')
  const assetClass = searchParams.get('assetClass')
  const strategyId = searchParams.get('strategyId')
  const tagId = searchParams.get('tagId')
  const emotion = searchParams.get('emotion')
  const minR = searchParams.get('minR')
  const maxR = searchParams.get('maxR')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = supabase
    .from('trades')
    .select(`
      *,
      tags:trade_tags(tag:tags(*)),
      strategies:trade_strategies(strategy:strategies(*))
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (accountId) query = query.eq('account_id', accountId)
  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo + 'T23:59:59Z')
  if (symbol) query = query.ilike('symbol', `%${symbol}%`)
  if (side) query = query.eq('side', side)
  if (status) query = query.eq('status', status)
  if (assetClass) query = query.eq('asset_class', assetClass)
  if (emotion) query = query.eq('emotion', emotion)
  if (minR) query = query.gte('r_multiple', parseFloat(minR))
  if (maxR) query = query.lte('r_multiple', parseFloat(maxR))

  if (strategyId) {
    const { data: tradeIds } = await supabase
      .from('trade_strategies')
      .select('trade_id')
      .eq('strategy_id', strategyId)
    const ids = (tradeIds ?? []).map(r => (r as { trade_id: string }).trade_id)
    if (ids.length === 0) return Response.json({ trades: [], total: 0, page })
    query = query.in('id', ids)
  }

  if (tagId) {
    const { data: tradeIds } = await supabase
      .from('trade_tags')
      .select('trade_id')
      .eq('tag_id', tagId)
    const ids = (tradeIds ?? []).map(r => (r as { trade_id: string }).trade_id)
    if (ids.length === 0) return Response.json({ trades: [], total: 0, page })
    query = query.in('id', ids)
  }

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as TradeWithRelations[]
  const trades = rows.map(t => ({
    ...t,
    tags: t.tags?.map((r) => r.tag) ?? [],
    strategies: t.strategies?.map((r) => r.strategy) ?? [],
  }))

  return Response.json({ trades, total: count ?? 0, page })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    symbol, side, status, asset_class, account_id,
    entry_date, exit_date, entry_price, exit_price,
    quantity, stop_loss, take_profit, commission = 0,
    rating, emotion, notes, setup_notes, mistake_notes,
    screenshots = [], tag_ids = [], strategy_ids = [],
  } = body

  const gross_pnl = (status === 'closed' && exit_price != null)
    ? calcGrossPnl(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(quantity))
    : null
  const net_pnl = gross_pnl != null ? calcNetPnl(gross_pnl, parseFloat(commission)) : null
  const r_multiple = (stop_loss != null && exit_price != null)
    ? calcRMultiple(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(stop_loss))
    : null
  const risk_amount = stop_loss != null
    ? Math.abs(parseFloat(entry_price) - parseFloat(stop_loss)) * parseFloat(quantity)
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tradesTable = supabase.from('trades') as any
  const { data: trade, error } = await tradesTable
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      side, status, asset_class,
      account_id: account_id || null,
      entry_date, exit_date: exit_date || null,
      entry_price: parseFloat(entry_price),
      exit_price: exit_price ? parseFloat(exit_price) : null,
      quantity: parseFloat(quantity),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      commission: parseFloat(commission),
      gross_pnl, net_pnl, r_multiple, risk_amount,
      rating: rating || null,
      emotion: emotion || null,
      notes: notes || null,
      setup_notes: setup_notes || null,
      mistake_notes: mistake_notes || null,
      screenshots,
    })
    .select()
    .single() as { data: TradeRow | null; error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const tradeRecord = trade as TradeRow
  if (tag_ids.length > 0)
    await supabase.from('trade_tags').insert(tag_ids.map((tag_id: string) => ({ trade_id: tradeRecord.id, tag_id })))
  if (strategy_ids.length > 0)
    await supabase.from('trade_strategies').insert(strategy_ids.map((strategy_id: string) => ({ trade_id: tradeRecord.id, strategy_id })))

  revalidateTrades()
  return Response.json({ trade }, { status: 201 })
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { revalidateTrades } from '@/lib/revalidate'
import type { Database } from '@/types/database'

type TradeRow = Database['public']['Tables']['trades']['Row']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    .update({
      symbol: symbol.toUpperCase(), side, status, asset_class,
      account_id: account_id || null,
      entry_date, exit_date: exit_date || null,
      entry_price: parseFloat(entry_price),
      exit_price: exit_price ? parseFloat(exit_price) : null,
      quantity: parseFloat(quantity),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      commission: parseFloat(commission),
      gross_pnl, net_pnl, r_multiple, risk_amount,
      rating: rating || null, emotion: emotion || null,
      notes: notes || null, setup_notes: setup_notes || null,
      mistake_notes: mistake_notes || null, screenshots,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single() as { data: TradeRow | null; error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase.from('trade_tags').delete().eq('trade_id', id)
  await supabase.from('trade_strategies').delete().eq('trade_id', id)
  if (tag_ids.length > 0)
    await supabase.from('trade_tags').insert(tag_ids.map((tag_id: string) => ({ trade_id: id, tag_id })))
  if (strategy_ids.length > 0)
    await supabase.from('trade_strategies').insert(strategy_ids.map((s_id: string) => ({ trade_id: id, strategy_id: s_id })))

  revalidateTrades()
  return Response.json({ trade })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trade } = await supabase
    .from('trades')
    .select('screenshots')
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as { data: Pick<TradeRow, 'screenshots'> | null; error: { message: string } | null }

  if (trade?.screenshots?.length) {
    const paths = trade.screenshots.map((url: string) => {
      const marker = '/storage/v1/object/public/screenshots/'
      const idx = url.indexOf(marker)
      return idx >= 0 ? url.slice(idx + marker.length) : url
    })
    await supabase.storage.from('screenshots').remove(paths)
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  revalidateTrades()
  return Response.json({ ok: true })
}

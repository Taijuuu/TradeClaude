import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseMt5Date(s: string): string {
  // MT5 format: "2026.06.03 14:30:00" → ISO
  return s.replace(/(\d{4})\.(\d{2})\.(\d{2}) (\d{2}:\d{2}:\d{2})/, '$1-$2-$3T$4Z')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || !body.key) return Response.json({ ok: true })

  const supabase = await createClient()

  // Use service role to find user
  const { data: { user } } = await supabase.auth.getUser()

  // EA sends key = user_id — find account for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from('accounts')
    .select('id')
    .eq('user_id', body.key)
    .order('created_at')
    .limit(1)
    .single()

  const {
    ticket, symbol, side,
    volume, openPrice, closePrice,
    openTime, closeTime,
    profit, commission, swap,
  } = body

  const grossPnl = parseFloat((profit ?? 0).toFixed(4))
  const comm     = parseFloat((commission ?? 0).toFixed(4))
  const swapVal  = parseFloat((swap ?? 0).toFixed(4))
  const netPnl   = parseFloat((grossPnl + comm + swapVal).toFixed(4))

  const trade = {
    user_id:     body.key,
    account_id:  account?.id ?? null,
    symbol:      symbol ?? 'UNKNOWN',
    side:        side === 'long' ? 'long' : 'short',
    status:      'closed',
    asset_class: 'forex',
    entry_date:  parseMt5Date(openTime),
    exit_date:   parseMt5Date(closeTime),
    entry_price: parseFloat(openPrice ?? 0),
    exit_price:  parseFloat(closePrice ?? 0),
    quantity:    parseFloat(volume ?? 0),
    gross_pnl:   grossPnl,
    commission:  Math.abs(comm),
    net_pnl:     netPnl,
    mt5_ticket:  String(ticket),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('trades')
    .upsert(trade, { onConflict: 'mt5_ticket', ignoreDuplicates: true })

  if (error) {
    console.error('Webhook upsert error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')

  const dateFrom = new Date()
  dateFrom.setFullYear(dateFrom.getFullYear() - 1)
  const dateFromStr = dateFrom.toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('trades')
    .select('exit_date, net_pnl')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .gte('exit_date', dateFromStr)
    .not('net_pnl', 'is', null)

  if (accountId) query = query.eq('account_id', accountId)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Group by day
  const byDay = new Map<string, { netPnl: number; tradeCount: number }>()
  for (const t of trades ?? []) {
    if (!t.exit_date) continue
    const day = t.exit_date.split('T')[0]
    const existing = byDay.get(day) ?? { netPnl: 0, tradeCount: 0 }
    existing.netPnl += t.net_pnl ?? 0
    existing.tradeCount += 1
    byDay.set(day, existing)
  }

  const days = Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    netPnl: parseFloat(v.netPnl.toFixed(2)),
    tradeCount: v.tradeCount,
  }))

  return Response.json({ days })
}

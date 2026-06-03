import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')
  const dateFrom  = searchParams.get('dateFrom')
  const dateTo    = searchParams.get('dateTo')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('trades')
    .select('entry_date, exit_date, net_pnl')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .not('net_pnl', 'is', null)
    .not('exit_date', 'is', null)

  if (accountId) query = query.eq('account_id', accountId)
  if (dateFrom)  query = query.gte('exit_date', dateFrom)
  if (dateTo)    query = query.lte('exit_date', dateTo + 'T23:59:59Z')

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const points = (trades ?? []).map((t: { entry_date: string; exit_date: string; net_pnl: number }) => {
    const entry = new Date(t.entry_date)
    const exit  = new Date(t.exit_date)
    const timeMinutes = entry.getHours() * 60 + entry.getMinutes()
    const durationMinutes = Math.max(0, Math.round((exit.getTime() - entry.getTime()) / 60000))
    return {
      timeMinutes,
      durationMinutes,
      netPnl: parseFloat((t.net_pnl ?? 0).toFixed(2)),
    }
  })

  return Response.json({ points })
}

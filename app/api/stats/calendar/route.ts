import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcCalendarData } from '@/lib/calculations'
import type { Trade } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const accountId = searchParams.get('accountId')

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate + 'T23:59:59Z')

  if (accountId) query = query.eq('account_id', accountId)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: notes } = await supabase
    .from('notebook_entries')
    .select('trade_date')
    .eq('user_id', user.id)
    .gte('trade_date', startDate)
    .lte('trade_date', endDate)

  const noteDates = new Set(
    (notes ?? []).map(n => n.trade_date).filter(Boolean) as string[]
  )

  const { data: settings } = await supabase
    .from('settings')
    .select('breakeven_range')
    .eq('user_id', user.id)
    .single()

  const { days, weeklySummaries } = calcCalendarData(
    (trades ?? []) as Trade[],
    year,
    month,
    settings?.breakeven_range ?? 0,
    noteDates
  )

  return Response.json({ days, weeklySummaries })
}

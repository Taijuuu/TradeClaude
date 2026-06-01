import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcEquityCurve } from '@/lib/calculations'
import type { Trade } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const accountId = searchParams.get('accountId')

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'closed')

  if (dateFrom) query = query.gte('exit_date', dateFrom)
  if (dateTo) query = query.lte('exit_date', dateTo + 'T23:59:59Z')
  if (accountId) query = query.eq('account_id', accountId)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const data = calcEquityCurve((trades ?? []) as Trade[])
  return Response.json({ data })
}

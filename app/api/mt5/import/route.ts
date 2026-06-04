import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDeals, groupDealsToTrades } from '@/lib/metaapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = await request.json()

  try {
    const endTime   = new Date().toISOString()
    const startTime = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000).toISOString()

    const deals  = await fetchDeals(startTime, endTime)
    const trades = groupDealsToTrades(deals)

    if (trades.length === 0) {
      return Response.json({ imported: 0, message: 'Aucun trade trouvé' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('trades')
      .upsert(
        trades.map(t => ({
          ...t,
          user_id:    user.id,
          account_id: accountId ?? null,
        })),
        { onConflict: 'user_id,mt5_deal_id', ignoreDuplicates: true }
      )

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ imported: trades.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur import'
    return Response.json({ error: msg }, { status: 500 })
  }
}

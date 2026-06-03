import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaApiAccount, fetchDeals, dealsToTrades } from '@/lib/metaapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { metaapiAccountId, accountId } = await request.json()
  if (!metaapiAccountId) return Response.json({ error: 'metaapiAccountId requis' }, { status: 400 })

  try {
    // Get region from MetaAPI account
    const metaAccount = await getMetaApiAccount(metaapiAccountId)
    const region = metaAccount.region || 'vint-hill'

    // Fetch deals for the last 2 years
    const endTime   = new Date().toISOString()
    const startTime = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000).toISOString()

    const deals  = await fetchDeals(metaapiAccountId, region, startTime, endTime)
    const trades = dealsToTrades(deals)

    if (trades.length === 0) {
      return Response.json({ imported: 0, message: 'Aucun trade trouvé' })
    }

    // Upsert trades — skip existing by mt5_ticket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('trades')
      .upsert(
        trades.map(t => ({
          ...t,
          user_id:    user.id,
          account_id: accountId ?? null,
        })),
        { onConflict: 'mt5_ticket', ignoreDuplicates: true }
      )

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ imported: trades.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur import'
    return Response.json({ error: msg }, { status: 500 })
  }
}

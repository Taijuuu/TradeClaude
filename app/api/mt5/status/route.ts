import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaApiAccount } from '@/lib/metaapi'

// Without ?metaapiAccountId: returns last sync timestamp for the trades page UI
// With ?metaapiAccountId=xxx: returns MetaApi account connection state (used by connect form)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const metaapiAccountId = request.nextUrl.searchParams.get('metaapiAccountId')

  if (metaapiAccountId) {
    try {
      const account = await getMetaApiAccount(metaapiAccountId)
      return Response.json({ state: account.state, connectionStatus: account.connectionStatus, region: account.region })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur MetaAPI'
      return Response.json({ error: msg }, { status: 500 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('settings') as any)
    .select('last_mt5_sync_at, mt5_account_id')
    .eq('user_id', user.id)
    .single() as { data: { last_mt5_sync_at: string | null; mt5_account_id: string | null } | null }

  return Response.json({
    lastSyncAt: data?.last_mt5_sync_at ?? null,
    accountId: data?.mt5_account_id ?? process.env.METAAPI_ACCOUNT_ID ?? null,
    accountName: 'Gold',
  })
}

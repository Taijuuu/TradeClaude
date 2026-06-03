import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaApiAccount } from '@/lib/metaapi'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const metaapiAccountId = request.nextUrl.searchParams.get('metaapiAccountId')
  if (!metaapiAccountId) return Response.json({ error: 'metaapiAccountId requis' }, { status: 400 })

  try {
    const account = await getMetaApiAccount(metaapiAccountId)
    return Response.json({ state: account.state, connectionStatus: account.connectionStatus, region: account.region })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur MetaAPI'
    return Response.json({ error: msg }, { status: 500 })
  }
}

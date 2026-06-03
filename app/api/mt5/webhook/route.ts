import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dealsToTrades, MetaApiDeal } from '@/lib/metaapi'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ ok: true })

  const supabase = await createClient()

  // MetaAPI sends deal events — process if it's a closing deal
  const deal: MetaApiDeal = body.deal ?? body
  if (!deal?.positionId || deal.entryType !== 'DEAL_ENTRY_OUT') {
    return Response.json({ ok: true })
  }

  // Find the account by metaapi_account_id
  const metaapiAccountId = body.accountId ?? body.metaAccountId
  if (!metaapiAccountId) return Response.json({ ok: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from('accounts')
    .select('id, user_id')
    .eq('metaapi_account_id', metaapiAccountId)
    .single()

  if (!account) return Response.json({ ok: true })

  // We only have the OUT deal here; we need the IN deal too
  // For now, store what we can and mark as needing reconciliation
  // The full import will fill the gaps on next login
  return Response.json({ ok: true })
}

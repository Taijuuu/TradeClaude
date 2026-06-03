import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteMetaApiAccount } from '@/lib/metaapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = await request.json()
  if (!accountId) return Response.json({ error: 'accountId requis' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from('accounts')
    .select('metaapi_account_id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (account?.metaapi_account_id) {
    try { await deleteMetaApiAccount(account.metaapi_account_id) } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('accounts')
    .update({ metaapi_account_id: null, mt5_login: null })
    .eq('id', accountId)
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}

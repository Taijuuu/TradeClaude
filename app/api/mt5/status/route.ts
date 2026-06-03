import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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

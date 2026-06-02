import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AccountRow = Database['public']['Tables']['accounts']['Row']

export async function GET(_: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('accounts') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at') as { data: AccountRow[] | null; error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ accounts: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, broker, type, balance, currency } = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('accounts') as any)
    .insert({ user_id: user.id, name, broker: broker || null, type, balance: balance || 0, currency: currency || 'USD' })
    .select()
    .single() as { data: AccountRow | null; error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ account: data }, { status: 201 })
}

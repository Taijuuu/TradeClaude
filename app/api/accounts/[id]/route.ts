import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AccountRow = Database['public']['Tables']['accounts']['Row']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, broker, type, balance, currency } = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('accounts') as any)
    .update({ name, broker: broker || null, type, balance: balance || 0, currency: currency || 'USD' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single() as { data: AccountRow | null; error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ account: data })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('accounts') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) as { error: { message: string } | null }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

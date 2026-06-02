import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidateStrategies } from '@/lib/revalidate'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, asset_class, entry_rules, exit_rules, risk_rules, checklist } = body

  if (!name || typeof name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('strategies')
    .update({
      name,
      description: description || null,
      asset_class: asset_class || null,
      entry_rules: entry_rules || null,
      exit_rules: exit_rules || null,
      risk_rules: risk_rules || null,
      checklist: checklist ?? [],
    } as any)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  revalidateStrategies()
  return Response.json({ strategy: data })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  revalidateStrategies()
  return Response.json({ ok: true })
}

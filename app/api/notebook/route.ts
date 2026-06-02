import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type')
  const tradeDate = searchParams.get('tradeDate')

  let query = supabase
    .from('notebook_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (tradeDate) query = query.eq('trade_date', tradeDate)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ entries: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, content = '', type = 'custom', trade_date } = body

  if (!title || !title.trim()) {
    return Response.json({ error: 'Le titre est requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notebook_entries')
    .insert([{
      user_id: user.id,
      title,
      content,
      type,
      trade_date: trade_date || null,
    }] as any)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ entry: data }, { status: 201 })
}

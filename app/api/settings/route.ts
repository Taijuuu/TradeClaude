import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type SettingsRow = Database['public']['Tables']['settings']['Row']

export async function GET(_: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('settings') as any)
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: SettingsRow | null }

  if (!settings) {
    return Response.json({
      settings: {
        user_id: user.id,
        default_commission: 0,
        breakeven_range: 0,
        currency: 'USD',
        timezone: 'Europe/Paris',
        display_mode: 'dollar',
      },
      hasApiKey: false,
    })
  }

  const { anthropic_api_key, ...rest } = settings
  return Response.json({ settings: rest, hasApiKey: !!anthropic_api_key })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('settings') as any)
    .upsert({ ...body, user_id: user.id })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

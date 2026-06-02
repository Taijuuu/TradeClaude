import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(_: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('settings') as any)
    .select('anthropic_api_key')
    .eq('user_id', user.id)
    .single() as { data: { anthropic_api_key: string | null } | null }

  const apiKey = settings?.anthropic_api_key
  if (!apiKey) return Response.json({ ok: false, error: 'Aucune clé configurée' })

  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ok' }],
    })
    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Clé invalide'
    return Response.json({ ok: false, error: msg })
  }
}

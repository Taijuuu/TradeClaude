import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeWithClaude } from '@/lib/claude'
import { calcAggregatedStats } from '@/lib/calculations'
import type { Trade } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await request.json()
  if (!prompt) return Response.json({ error: 'prompt requis' }, { status: 400 })

  // Lire la clé API depuis les settings (jamais exposée côté client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('settings') as any)
    .select('anthropic_api_key')
    .eq('user_id', user.id)
    .single() as { data: { anthropic_api_key: string | null } | null }

  const apiKey = settings?.anthropic_api_key
  if (!apiKey) return Response.json({ error: 'Clé API Anthropic non configurée. Va dans Settings > AI Claude.' }, { status: 400 })

  // Contexte de trading des 30 derniers jours
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .gte('entry_date', thirtyDaysAgo)
    .order('entry_date', { ascending: false })

  const allTrades = (trades ?? []) as Trade[]
  const stats = calcAggregatedStats(allTrades)

  const context = {
    period: { from: thirtyDaysAgo.slice(0, 10), to: new Date().toISOString().slice(0, 10) },
    stats,
    topSymbols: [],
    topStrategies: [],
    emotionBreakdown: [],
    recentTrades: allTrades.slice(0, 20),
    worstTags: [],
  }

  try {
    const response = await analyzeWithClaude(prompt, context, apiKey)
    return Response.json({ response })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur Claude'
    return Response.json({ error: msg }, { status: 500 })
  }
}

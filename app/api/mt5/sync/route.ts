import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDeals, groupDealsToTrades } from '@/lib/metaapi'

const DEFAULT_START = '2026-01-01T00:00:00.000Z'

// Trouve (ou crée) le compte "MetaTrader" de l'utilisateur pour que les trades
// synchronisés soient rattachés à un compte et visibles avec les filtres.
async function getOrCreateMt5Account(userId: string, supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('accounts') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('broker', 'MT5')
    .maybeSingle() as { data: { id: string } | null }

  if (existing) return existing.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created } = await (supabase.from('accounts') as any)
    .insert({ user_id: userId, name: 'MetaTrader', broker: 'MT5', type: 'live', balance: 0, currency: 'USD' })
    .select('id')
    .single() as { data: { id: string } | null }

  return created!.id
}

async function syncForUser(userId: string, supabase: ReturnType<typeof createAdminClient>) {
  // 1. Fenêtre de sync : depuis la dernière sync, MAIS étendue pour couvrir
  // les trades MT5 encore ouverts — sinon leur deal d'entrée sort de la
  // fenêtre et ils ne se ferment jamais.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('settings') as any)
    .select('last_mt5_sync_at')
    .eq('user_id', userId)
    .single() as { data: { last_mt5_sync_at: string | null } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openTrades } = await (supabase.from('trades') as any)
    .select('entry_date')
    .eq('user_id', userId)
    .eq('status', 'open')
    .not('mt5_position_id', 'is', null)
    .order('entry_date', { ascending: true })
    .limit(1) as { data: { entry_date: string }[] | null }

  let from = settings?.last_mt5_sync_at ?? DEFAULT_START
  const earliestOpen = openTrades?.[0]?.entry_date
  if (earliestOpen && earliestOpen < from) from = earliestOpen
  const to = new Date().toISOString()

  // 2. Fetch + regroupement des deals MetaApi
  const deals = await fetchDeals(from, to)
  if (deals.length === 0) {
    return { inserted: 0, updated: 0, lastSyncAt: to }
  }

  const { trades, closes } = groupDealsToTrades(deals)
  const accountId = await getOrCreateMt5Account(userId, supabase)

  let inserted = 0
  let updated = 0

  // 3. Upsert des trades complets (entrée dans la fenêtre)
  for (const trade of trades) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('trades') as any)
      .select('id, status')
      .eq('user_id', userId)
      .eq('mt5_position_id', trade.mt5_position_id)
      .maybeSingle() as { data: { id: string; status: string } | null }

    if (existing) {
      // Ne ré-écrit pas un trade déjà fermé (préserve notes/édits manuels)
      if (existing.status === 'closed' && trade.status === 'closed') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('trades') as any).update({
        status: trade.status,
        exit_price: trade.exit_price,
        exit_date: trade.exit_date,
        gross_pnl: trade.gross_pnl,
        net_pnl: trade.net_pnl,
        commission: trade.commission,
        account_id: accountId,
      }).eq('id', existing.id)
      updated++
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('trades') as any).insert({
        user_id: userId,
        account_id: accountId,
        mt5_deal_id: trade.mt5_deal_id,
        mt5_position_id: trade.mt5_position_id,
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        asset_class: 'forex',
        entry_date: trade.entry_date,
        exit_date: trade.exit_date,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        commission: trade.commission,
        gross_pnl: trade.gross_pnl,
        net_pnl: trade.net_pnl,
        screenshots: [],
      })
      inserted++
    }
  }

  // 4. Clôtures de positions ouvertes lors d'une sync précédente
  // (deal d'entrée hors fenêtre — le trade existe en base avec status 'open')
  for (const close of closes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: openTrade } = await (supabase.from('trades') as any)
      .select('id, commission')
      .eq('user_id', userId)
      .eq('mt5_position_id', close.mt5_position_id)
      .eq('status', 'open')
      .maybeSingle() as { data: { id: string; commission: number } | null }

    if (!openTrade) continue

    const totalCommission = (openTrade.commission ?? 0) + close.out_commission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('trades') as any).update({
      status: 'closed',
      exit_price: close.exit_price,
      exit_date: close.exit_date,
      gross_pnl: close.gross_pnl,
      net_pnl: close.gross_pnl - totalCommission + close.swap,
      commission: totalCommission,
      account_id: accountId,
    }).eq('id', openTrade.id)
    updated++
  }

  // 5. Avance le curseur de sync au deal le plus récent
  const latestDealTime = deals.reduce((max, d) => d.time > max ? d.time : max, deals[0].time)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('settings') as any).upsert({
    user_id: userId,
    last_mt5_sync_at: latestDealTime,
    mt5_account_id: process.env.METAAPI_ACCOUNT_ID,
  })

  return { inserted, updated, lastSyncAt: latestDealTime }
}

export async function POST(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron') === '1'

  if (isCron) {
    const admin = createAdminClient()
    // Find all users with mt5_account_id configured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsRows } = await (admin.from('settings') as any)
      .select('user_id')
      .not('mt5_account_id', 'is', null) as { data: { user_id: string }[] | null }

    const users = settingsRows ?? []
    // If no users have mt5 configured yet, sync for all users using env account
    if (users.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allSettings } = await (admin.from('settings') as any)
        .select('user_id') as { data: { user_id: string }[] | null }
      for (const row of (allSettings ?? [])) {
        await syncForUser(row.user_id, admin)
      }
    } else {
      for (const row of users) {
        await syncForUser(row.user_id, admin)
      }
    }
    return Response.json({ ok: true })
  }

  // Manual sync — authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()
    const result = await syncForUser(user.id, admin)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

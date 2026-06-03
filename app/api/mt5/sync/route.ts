import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDeals, groupDealsToTrades } from '@/lib/metaapi'

const DEFAULT_START = '2026-01-01T00:00:00.000Z'

async function syncForUser(userId: string, supabase: ReturnType<typeof createAdminClient>) {
  // 1. Read last sync timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('settings') as any)
    .select('last_mt5_sync_at')
    .eq('user_id', userId)
    .single() as { data: { last_mt5_sync_at: string | null } | null }

  const from = settings?.last_mt5_sync_at ?? DEFAULT_START
  const to = new Date().toISOString()

  // 2. Fetch deals from MetaApi
  const deals = await fetchDeals(from, to)
  if (deals.length === 0) {
    return { inserted: 0, updated: 0, lastSyncAt: to }
  }

  // 3. Group into trades
  const trades = groupDealsToTrades(deals)

  // 4. Upsert into Supabase
  let inserted = 0
  let updated = 0

  for (const trade of trades) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('trades') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('mt5_deal_id', trade.mt5_deal_id)
      .maybeSingle() as { data: { id: string } | null }

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('trades') as any).update({
        status: trade.status,
        exit_price: trade.exit_price,
        exit_date: trade.exit_date,
        gross_pnl: trade.gross_pnl,
        net_pnl: trade.net_pnl,
        commission: trade.commission,
      }).eq('id', existing.id)
      updated++
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('trades') as any).insert({
        user_id: userId,
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

  // 5. Update last_mt5_sync_at to the most recent deal time
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

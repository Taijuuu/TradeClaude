# MetaApi MT5 Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync MT5 deals from MetaApi into Supabase trades, triggered by a UI button and a Vercel cron every 15 min.

**Architecture:** Pure REST calls to MetaApi (no SDK). `lib/metaapi.ts` handles fetch + deal grouping. `POST /api/mt5/sync` is the single sync endpoint used by both manual button and Vercel cron. Delta sync via `last_mt5_sync_at` stored in `settings`.

**Tech Stack:** Next.js 16, Supabase, MetaApi REST API, Vercel Cron, shadcn/ui, sonner, lucide-react.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `types/database.ts` | Modify | Add mt5 columns to trades + settings Row types |
| `.env.local` | Modify | Add METAAPI_TOKEN + METAAPI_ACCOUNT_ID |
| `.env.example` | Modify | Document new env vars |
| `lib/supabase/admin.ts` | Create | Cookie-free Supabase admin client (for cron) |
| `lib/metaapi.ts` | Create | MetaApi types, fetchDeals(), groupDealsToTrades() |
| `app/api/mt5/sync/route.ts` | Create | POST — manual + cron sync handler |
| `app/api/mt5/status/route.ts` | Create | GET — last sync timestamp for UI |
| `vercel.json` | Modify | Add cron schedule |
| `app/(dashboard)/trades/page.tsx` | Modify | Add Sync MT5 button + last sync label |

---

## Task 1 — Supabase schema migration

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Run SQL in Supabase dashboard**

Go to your Supabase project → SQL Editor → run:

```sql
-- Add MT5 columns to trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mt5_deal_id text;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mt5_position_id text;
CREATE UNIQUE INDEX IF NOT EXISTS trades_mt5_deal_user_idx
  ON trades(user_id, mt5_deal_id)
  WHERE mt5_deal_id IS NOT NULL;

-- Add MT5 columns to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS last_mt5_sync_at timestamptz;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mt5_account_id text;
```

Expected: 5 statements run successfully, 0 errors.

- [ ] **Step 2: Update `types/database.ts` — trades Row**

Find the trades Row block and add the two new columns after `screenshots`:

```ts
          screenshots: string[]
          mt5_deal_id: string | null
          mt5_position_id: string | null
          created_at: string
          updated_at: string
```

- [ ] **Step 3: Update `types/database.ts` — settings Row**

Find the settings Row block and add the two new columns after `display_mode`:

```ts
          display_mode: 'dollar' | 'percentage' | 'r_multiple'
          last_mt5_sync_at: string | null
          mt5_account_id: string | null
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/timeo/trading-journal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add types/database.ts
git commit -m "feat: add mt5_deal_id, mt5_position_id to trades and mt5 fields to settings schema"
```

---

## Task 2 — Environment variables

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

- [ ] **Step 1: Add to `.env.local`**

Append these two lines:

```
METAAPI_TOKEN=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjZmUwMzNlYTU0OGFjYzk4MTFjODI4ZTIwYzU3Zjk1YSIsImFjY2Vzc1J1bGVzIjpbeyJpZCI6InRyYWRpbmctYWNjb3VudC1tYW5hZ2VtZW50LWFwaSIsIm1ldGhvZHMiOlsidHJhZGluZy1hY2NvdW50LW1hbmFnZW1lbnQtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcmVzdC1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcnBjLWFwaSIsIm1ldGhvZHMiOlsibWV0YWFwaS1hcGk6d3M6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcmVhbC10aW1lLXN0cmVhbWluZy1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOndzOnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIiwid3JpdGVyIl0sInJlc291cmNlcyI6WyIqOiRVU0VSX0lEJDoqIl19XSwiaWdub3JlUmF0ZUxpbWl0cyI6ZmFsc2UsInRva2VuSWQiOiIyMDIxMDIxMyIsImltcGVyc29uYXRlZCI6ZmFsc2UsInJlYWxVc2VySWQiOiJjZmUwMzNlYTU0OGFjYzk4MTFjODI4ZTIwYzU3Zjk1YSIsImlhdCI6MTc4MDUwMzY4MH0.akrEbqmZdVLGe29_F6wZ1EkOikozaTImk1v7VA3jt_DBlfOKA4yV3WJENShwyc2cRbPF-pzb9ZoQ2jQKNhHhY5w8OfLVcI9iOpBouZWRsYG9ZB5tSn6KBaE4sKl5lKHDIFdGl5yrCcHfW1BbXfVEW4FR1xGv4UIDSbh6s-kxlnaqwXY9RaEVDVAjvw54T7LWBvBnOMroaH6tOBRIJwbNvYR2jIEZQYvd9GAViQhVlvuR042IlgWYcKntJEB7wkwapmYHVLnKbmFEHtIG8nmVhEOUiJx4t-7FgrlflFlyG8b5IkBFa-bZs5_DzaVlpU3xRq5Oxvxsd8KKIw8b2VFQbG9domwIFB4XlTdhTtpbo_T0JUGEhndLCJEG4aY2Uk40i3t2Ck8ksnSmPi3WRKPrkYN6sVe306FjuXq_iqfeVRu7lfjhxetCl57pWSq87S2JA5ApFEiEObhipl3JZ0pgC-HpEwXyQOEy3VFFGMjDPdJkV0mBAowMyo4VkyiE2Hmku60mGu4O5vspJPTyfBvc-msudvnoPlAKfI1OsKtz2MZ72-h2qPS2tVtEIFtN0sbwNdWFX50yjWA6cJ8XDFe1dBK9dcYa9BSAB4gFR19CLvcQxDTW1B3s9raSmIgxfG39xPDU9y-dib7PmRXZxKpLIGVy1DvvUqmKf1ziVK4wDUo
METAAPI_ACCOUNT_ID=9a9d9570-3bb5-4432-b00c-1c12001aece6
```

- [ ] **Step 2: Update `.env.example`**

Append:

```
METAAPI_TOKEN=
METAAPI_ACCOUNT_ID=
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: document METAAPI_TOKEN and METAAPI_ACCOUNT_ID env vars"
```

Note: `.env.local` is gitignored — do NOT commit it.

---

## Task 3 — `lib/supabase/admin.ts`

**Files:**
- Create: `lib/supabase/admin.ts`

The existing `createServiceClient()` in `server.ts` uses `cookies()` which fails in cron context (no request headers). We need a plain admin client for the cron path.

- [ ] **Step 1: Create `lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: add cookie-free Supabase admin client for cron context"
```

---

## Task 4 — `lib/metaapi.ts`

**Files:**
- Create: `lib/metaapi.ts`

- [ ] **Step 1: Create `lib/metaapi.ts`**

```ts
const BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai'

export interface MetaApiDeal {
  id: string
  positionId: string
  platform: string
  type: string        // 'DEAL_TYPE_BUY' | 'DEAL_TYPE_SELL' | 'DEAL_TYPE_BALANCE' | ...
  entryType: string   // 'DEAL_ENTRY_IN' | 'DEAL_ENTRY_OUT' | 'DEAL_ENTRY_INOUT'
  symbol: string
  time: string        // ISO 8601
  price: number
  volume: number
  profit: number
  commission: number  // negative value (cost)
  swap: number
  comment?: string
}

export interface MappedTrade {
  mt5_deal_id: string
  mt5_position_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  entry_date: string
  quantity: number
  commission: number   // stored as positive
  status: 'open' | 'closed'
  exit_price: number | null
  exit_date: string | null
  gross_pnl: number | null
  net_pnl: number | null
}

export async function fetchDeals(from: string, to: string): Promise<MetaApiDeal[]> {
  const accountId = process.env.METAAPI_ACCOUNT_ID!
  const token = process.env.METAAPI_TOKEN!
  const url = `${BASE}/users/current/accounts/${accountId}/history-deals/time/${from}/${to}`

  const res = await fetch(url, {
    headers: { 'auth-token': token },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MetaApi ${res.status}: ${text}`)
  }

  const deals: MetaApiDeal[] = await res.json()
  return deals.filter(d => d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL')
}

export function groupDealsToTrades(deals: MetaApiDeal[]): MappedTrade[] {
  const groups = new Map<string, { in?: MetaApiDeal; out?: MetaApiDeal }>()

  for (const deal of deals) {
    const group = groups.get(deal.positionId) ?? {}
    if (deal.entryType === 'DEAL_ENTRY_IN') group.in = deal
    else if (deal.entryType === 'DEAL_ENTRY_OUT') group.out = deal
    groups.set(deal.positionId, group)
  }

  const trades: MappedTrade[] = []

  for (const [, { in: inDeal, out: outDeal }] of groups) {
    if (!inDeal) continue

    const isClosed = !!outDeal
    // commission from MetaApi is negative — store as positive in DB
    const totalCommission = Math.abs((inDeal.commission ?? 0) + (outDeal?.commission ?? 0))
    const grossPnl = isClosed ? (outDeal!.profit ?? 0) : null
    // net = gross + raw commissions (negative) + swap (pos/neg)
    const netPnl = grossPnl != null
      ? grossPnl + (inDeal.commission ?? 0) + (outDeal!.commission ?? 0) + (outDeal!.swap ?? 0)
      : null

    trades.push({
      mt5_deal_id: inDeal.id,
      mt5_position_id: inDeal.positionId,
      symbol: inDeal.symbol,
      side: inDeal.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
      entry_price: inDeal.price,
      entry_date: inDeal.time,
      quantity: inDeal.volume,
      commission: totalCommission,
      status: isClosed ? 'closed' : 'open',
      exit_price: isClosed ? outDeal!.price : null,
      exit_date: isClosed ? outDeal!.time : null,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
    })
  }

  return trades
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/metaapi.ts
git commit -m "feat: add MetaApi client — fetchDeals and groupDealsToTrades"
```

---

## Task 5 — `POST /api/mt5/sync`

**Files:**
- Create: `app/api/mt5/sync/route.ts`

This route is called by both the UI button (authenticated user) and Vercel cron (`x-vercel-cron: 1` header, no auth cookie).

- [ ] **Step 1: Create `app/api/mt5/sync/route.ts`**

```ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/mt5/sync/route.ts
git commit -m "feat: add POST /api/mt5/sync route with delta sync and cron support"
```

---

## Task 6 — `GET /api/mt5/status`

**Files:**
- Create: `app/api/mt5/status/route.ts`

- [ ] **Step 1: Create `app/api/mt5/status/route.ts`**

```ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/mt5/status/route.ts
git commit -m "feat: add GET /api/mt5/status route"
```

---

## Task 7 — Vercel cron config

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update `vercel.json`**

Replace the full content with:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/mt5/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron for MT5 sync every 15 minutes"
```

---

## Task 8 — Trades page UI

**Files:**
- Modify: `app/(dashboard)/trades/page.tsx`

Add a "Sync MT5" button next to "Add Trade". On click, calls `POST /api/mt5/sync`, shows a spinner, toasts the result. Shows "Last sync: X min ago" below.

- [ ] **Step 1: Replace `app/(dashboard)/trades/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useTrades } from '@/hooks/useTrades'
import { TradeTable } from '@/components/trades/TradeTable'
import { TradeForm } from '@/components/trades/TradeForm'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Trade } from '@/types'

function useLastSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/mt5/status')
      .then(r => r.json())
      .then(d => setLastSyncAt(d.lastSyncAt ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  return { lastSyncAt, reload: load }
}

function formatSyncAge(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

export default function TradesPage() {
  const { dateFrom, dateTo, accountIds, assetClasses } = useFiltersStore()
  const accountId = accountIds[0]
  const assetClass = assetClasses[0]

  const { trades, total, loading, page, setPage, refresh } = useTrades({
    dateFrom, dateTo, accountId, assetClass,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [syncing, setSyncing] = useState(false)
  const { lastSyncAt, reload: reloadStatus } = useLastSync()

  function handleEdit(trade: Trade) {
    setEditingTrade(trade)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingTrade(null)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/mt5/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Sync échouée')
      } else {
        const total = (data.inserted ?? 0) + (data.updated ?? 0)
        toast.success(
          total === 0
            ? 'Aucun nouveau trade'
            : `${data.inserted} importé${data.inserted !== 1 ? 's' : ''}, ${data.updated} mis à jour`
        )
        refresh()
        reloadStatus()
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {total} trade{total !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-3">
          {/* MT5 Sync button */}
          <div className="flex flex-col items-end gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={syncing}
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin mr-1' : 'mr-1'} />
              {syncing ? 'Sync...' : 'Sync MT5'}
            </Button>
            {lastSyncAt && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {formatSyncAge(lastSyncAt)}
              </span>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => setFormOpen(true)}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus size={14} className="mr-1" /> Add Trade
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <TradeTable
            trades={trades}
            loading={loading}
            onEdit={handleEdit}
            onDeleted={refresh}
          />
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="ghost" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ color: 'var(--text-muted)' }}
            >
              Précédent
            </Button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page}</span>
            <Button
              variant="ghost" size="sm"
              disabled={page * 50 >= total}
              onClick={() => setPage(page + 1)}
              style={{ color: 'var(--text-muted)' }}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>

      {/* TradeForm drawer */}
      <TradeForm
        open={formOpen}
        onClose={handleClose}
        trade={editingTrade}
        onSaved={refresh}
      />
    </main>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/trades/page.tsx
git commit -m "feat: add Sync MT5 button and last-sync indicator to Trades page"
```

---

## Task 9 — Deploy to Vercel

- [ ] **Step 1: Add env vars to Vercel**

In Vercel dashboard → Project Settings → Environment Variables, add:
- `METAAPI_TOKEN` = (the full JWT token)
- `METAAPI_ACCOUNT_ID` = `9a9d9570-3bb5-4432-b00c-1c12001aece6`

Also verify `SUPABASE_SERVICE_ROLE_KEY` is set (needed for admin client in cron).

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Verify Vercel build passes**

Check Vercel dashboard — build should succeed with no errors.

- [ ] **Step 4: Test manual sync on prod**

Go to `tradeclaude.vercel.app/trades` → click "Sync MT5" → expect toast with result.

- [ ] **Step 5: Verify cron is registered**

In Vercel dashboard → Project → Crons tab → confirm `/api/mt5/sync` appears with `*/15 * * * *`.

---

## Self-Review

**Spec coverage:**
- ✅ POST /api/mt5/sync — Task 5
- ✅ GET /api/mt5/status — Task 6
- ✅ Delta sync via last_mt5_sync_at — Task 5 `syncForUser()`
- ✅ Upsert by mt5_deal_id — Task 5 (check existing → update or insert)
- ✅ BUY/SELL only filter — Task 4 `fetchDeals()` filter
- ✅ Deal grouping by positionId — Task 4 `groupDealsToTrades()`
- ✅ Schema migration — Task 1
- ✅ Vercel cron — Task 7
- ✅ UI button + spinner + last sync — Task 8
- ✅ Env vars — Task 2
- ✅ Admin client for cron — Task 3

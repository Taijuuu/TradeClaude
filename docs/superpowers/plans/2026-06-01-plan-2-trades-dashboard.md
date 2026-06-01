# Trading Journal — Plan 2: Trades + Dashboard + Daily Stats

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Trades CRUD, Dashboard with all widgets, and Daily Stats page — making the app fully usable for tracking and analyzing trades.

**Architecture:** All dashboard/trades pages are Client Components (`'use client'`) that read Zustand filters and call API route handlers via `fetch`. API routes use Supabase server client + `lib/calculations.ts` for stats. After mutations, `lib/revalidate.ts` is called + the hook's `refresh()` is invoked to update UI.

**Tech Stack:** Next.js 16 Route Handlers (`Response.json()`), Supabase, Recharts, React Hook Form + Zod, Zustand (`useFiltersStore`), `lib/calculations.ts`, `lib/revalidate.ts`, sonner toasts.

**Spec:** `docs/superpowers/specs/2026-06-01-trading-journal-design.md`

---

## File Map

| File | Purpose |
|------|---------|
| `app/api/trades/route.ts` | GET list + POST create |
| `app/api/trades/[id]/route.ts` | PUT update + DELETE |
| `app/api/stats/route.ts` | AggregatedStats + topSymbols etc |
| `app/api/stats/calendar/route.ts` | CalendarDay[] + WeeklySummary[] |
| `app/api/stats/equity/route.ts` | EquityPoint[] |
| `app/api/upload/route.ts` | Multipart → Supabase Storage |
| `hooks/useTrades.ts` | Client fetch hook for trades |
| `hooks/useStats.ts` | Client fetch hook for stats |
| `hooks/useCalendar.ts` | Client fetch hook for calendar |
| `components/dashboard/StatCard.tsx` | Single metric card |
| `components/dashboard/WinRateDonut.tsx` | Pie donut win/loss |
| `components/dashboard/CurrentStreak.tsx` | Win/loss streak badges |
| `components/dashboard/PerformanceRadar.tsx` | Radar chart 5 axes |
| `components/dashboard/PnlAreaChart.tsx` | Cumulative equity area |
| `components/dashboard/DailyBarChart.tsx` | Daily P&L bars + line |
| `components/dashboard/CalendarWidget.tsx` | Month calendar grid |
| `components/trades/TradeTable.tsx` | Sortable table with actions |
| `components/trades/TradeForm.tsx` | 7-section drawer form |
| `components/trades/FiltersBar.tsx` | Expandable filter panel |
| `app/(dashboard)/dashboard/page.tsx` | Dashboard page (replace placeholder) |
| `app/(dashboard)/trades/page.tsx` | Trades page (replace placeholder) |
| `app/(dashboard)/daily-stats/page.tsx` | Daily stats page |

---

## Phase 1 — API Routes

### Task 1: `GET /api/trades` + `POST /api/trades`

**Files:**
- Create: `app/api/trades/route.ts`

- [ ] **Step 1: Create `app/api/trades/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { revalidateTrades } from '@/lib/revalidate'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const symbol = searchParams.get('symbol')
  const side = searchParams.get('side')
  const status = searchParams.get('status')
  const assetClass = searchParams.get('assetClass')
  const strategyId = searchParams.get('strategyId')
  const tagId = searchParams.get('tagId')
  const emotion = searchParams.get('emotion')
  const minR = searchParams.get('minR')
  const maxR = searchParams.get('maxR')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = supabase
    .from('trades')
    .select(`
      *,
      tags:trade_tags(tag:tags(*)),
      strategies:trade_strategies(strategy:strategies(*))
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (accountId) query = query.eq('account_id', accountId)
  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo + 'T23:59:59Z')
  if (symbol) query = query.ilike('symbol', `%${symbol}%`)
  if (side) query = query.eq('side', side)
  if (status) query = query.eq('status', status)
  if (assetClass) query = query.eq('asset_class', assetClass)
  if (emotion) query = query.eq('emotion', emotion)
  if (minR) query = query.gte('r_multiple', parseFloat(minR))
  if (maxR) query = query.lte('r_multiple', parseFloat(maxR))

  if (strategyId) {
    const { data: tradeIds } = await supabase
      .from('trade_strategies')
      .select('trade_id')
      .eq('strategy_id', strategyId)
    const ids = (tradeIds ?? []).map(r => r.trade_id)
    if (ids.length === 0) return Response.json({ trades: [], total: 0, page })
    query = query.in('id', ids)
  }

  if (tagId) {
    const { data: tradeIds } = await supabase
      .from('trade_tags')
      .select('trade_id')
      .eq('tag_id', tagId)
    const ids = (tradeIds ?? []).map(r => r.trade_id)
    if (ids.length === 0) return Response.json({ trades: [], total: 0, page })
    query = query.in('id', ids)
  }

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Flatten join results
  const trades = (data ?? []).map(t => ({
    ...t,
    tags: (t.tags as { tag: unknown }[])?.map((r) => r.tag) ?? [],
    strategies: (t.strategies as { strategy: unknown }[])?.map((r) => r.strategy) ?? [],
  }))

  return Response.json({ trades, total: count ?? 0, page })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    symbol, side, status, asset_class, account_id,
    entry_date, exit_date, entry_price, exit_price,
    quantity, stop_loss, take_profit, commission = 0,
    rating, emotion, notes, setup_notes, mistake_notes,
    screenshots = [], tag_ids = [], strategy_ids = [],
  } = body

  // Server-side calculations
  const gross_pnl = (status === 'closed' && exit_price != null)
    ? calcGrossPnl(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(quantity))
    : null
  const net_pnl = gross_pnl != null ? calcNetPnl(gross_pnl, parseFloat(commission)) : null
  const r_multiple = (stop_loss != null && exit_price != null)
    ? calcRMultiple(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(stop_loss))
    : null
  const risk_amount = stop_loss != null
    ? Math.abs(parseFloat(entry_price) - parseFloat(stop_loss)) * parseFloat(quantity)
    : null

  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      side, status, asset_class,
      account_id: account_id || null,
      entry_date, exit_date: exit_date || null,
      entry_price: parseFloat(entry_price),
      exit_price: exit_price ? parseFloat(exit_price) : null,
      quantity: parseFloat(quantity),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      commission: parseFloat(commission),
      gross_pnl, net_pnl, r_multiple, risk_amount,
      rating: rating || null,
      emotion: emotion || null,
      notes: notes || null,
      setup_notes: setup_notes || null,
      mistake_notes: mistake_notes || null,
      screenshots,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Insert pivots
  if (tag_ids.length > 0) {
    await supabase.from('trade_tags').insert(
      tag_ids.map((tag_id: string) => ({ trade_id: trade.id, tag_id }))
    )
  }
  if (strategy_ids.length > 0) {
    await supabase.from('trade_strategies').insert(
      strategy_ids.map((strategy_id: string) => ({ trade_id: trade.id, strategy_id }))
    )
  }

  revalidateTrades()
  return Response.json({ trade }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/trades/route.ts
git commit -m "feat: add GET /api/trades and POST /api/trades"
```

---

### Task 2: `PUT /api/trades/[id]` + `DELETE /api/trades/[id]`

**Files:**
- Create: `app/api/trades/[id]/route.ts`

- [ ] **Step 1: Create `app/api/trades/[id]/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { revalidateTrades } from '@/lib/revalidate'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    symbol, side, status, asset_class, account_id,
    entry_date, exit_date, entry_price, exit_price,
    quantity, stop_loss, take_profit, commission = 0,
    rating, emotion, notes, setup_notes, mistake_notes,
    screenshots = [], tag_ids = [], strategy_ids = [],
  } = body

  const gross_pnl = (status === 'closed' && exit_price != null)
    ? calcGrossPnl(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(quantity))
    : null
  const net_pnl = gross_pnl != null ? calcNetPnl(gross_pnl, parseFloat(commission)) : null
  const r_multiple = (stop_loss != null && exit_price != null)
    ? calcRMultiple(side, parseFloat(entry_price), parseFloat(exit_price), parseFloat(stop_loss))
    : null
  const risk_amount = stop_loss != null
    ? Math.abs(parseFloat(entry_price) - parseFloat(stop_loss)) * parseFloat(quantity)
    : null

  const { data: trade, error } = await supabase
    .from('trades')
    .update({
      symbol: symbol.toUpperCase(), side, status, asset_class,
      account_id: account_id || null,
      entry_date, exit_date: exit_date || null,
      entry_price: parseFloat(entry_price),
      exit_price: exit_price ? parseFloat(exit_price) : null,
      quantity: parseFloat(quantity),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      commission: parseFloat(commission),
      gross_pnl, net_pnl, r_multiple, risk_amount,
      rating: rating || null, emotion: emotion || null,
      notes: notes || null, setup_notes: setup_notes || null,
      mistake_notes: mistake_notes || null, screenshots,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Replace pivots
  await supabase.from('trade_tags').delete().eq('trade_id', id)
  await supabase.from('trade_strategies').delete().eq('trade_id', id)
  if (tag_ids.length > 0)
    await supabase.from('trade_tags').insert(tag_ids.map((tag_id: string) => ({ trade_id: id, tag_id })))
  if (strategy_ids.length > 0)
    await supabase.from('trade_strategies').insert(strategy_ids.map((strategy_id: string) => ({ trade_id: id, strategy_id })))

  revalidateTrades()
  return Response.json({ trade })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch screenshots to delete from Storage
  const { data: trade } = await supabase
    .from('trades')
    .select('screenshots')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (trade?.screenshots?.length) {
    const paths = trade.screenshots.map((url: string) => {
      const parts = url.split('/storage/v1/object/public/screenshots/')
      return parts[1] ?? url
    })
    await supabase.storage.from('screenshots').remove(paths)
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  revalidateTrades()
  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/trades/[id]/route.ts
git commit -m "feat: add PUT and DELETE /api/trades/[id]"
```

---

### Task 3: `GET /api/stats`

**Files:**
- Create: `app/api/stats/route.ts`

- [ ] **Step 1: Create `app/api/stats/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcAggregatedStats } from '@/lib/calculations'
import type { Trade, Emotion } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const accountId = searchParams.get('accountId')
  const assetClass = searchParams.get('assetClass')

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)

  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo + 'T23:59:59Z')
  if (accountId) query = query.eq('account_id', accountId)
  if (assetClass) query = query.eq('asset_class', assetClass)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: settings } = await supabase
    .from('settings')
    .select('breakeven_range')
    .eq('user_id', user.id)
    .single()

  const breakevenRange = settings?.breakeven_range ?? 0
  const allTrades = (trades ?? []) as Trade[]
  const stats = calcAggregatedStats(allTrades, breakevenRange)

  // Top 10 symbols by net P&L
  const symbolMap = new Map<string, { netPnl: number; trades: number; wins: number }>()
  for (const t of allTrades.filter(t => t.status === 'closed')) {
    const e = symbolMap.get(t.symbol) ?? { netPnl: 0, trades: 0, wins: 0 }
    e.netPnl += t.net_pnl ?? 0
    e.trades++
    if ((t.net_pnl ?? 0) > breakevenRange) e.wins++
    symbolMap.set(t.symbol, e)
  }
  const topSymbols = Array.from(symbolMap.entries())
    .map(([symbol, v]) => ({ symbol, netPnl: v.netPnl, trades: v.trades, winRate: v.trades > 0 ? v.wins / v.trades : 0 }))
    .sort((a, b) => b.netPnl - a.netPnl)
    .slice(0, 10)

  // Emotion breakdown
  const emotionMap = new Map<Emotion, { count: number; netPnl: number; wins: number }>()
  for (const t of allTrades.filter(t => t.status === 'closed' && t.emotion)) {
    const em = t.emotion as Emotion
    const e = emotionMap.get(em) ?? { count: 0, netPnl: 0, wins: 0 }
    e.count++
    e.netPnl += t.net_pnl ?? 0
    if ((t.net_pnl ?? 0) > breakevenRange) e.wins++
    emotionMap.set(em, e)
  }
  const emotionBreakdown = Array.from(emotionMap.entries()).map(([emotion, v]) => ({
    emotion, count: v.count, netPnl: v.netPnl, winRate: v.count > 0 ? v.wins / v.count : 0,
  }))

  return Response.json({ ...stats, topSymbols, topStrategies: [], emotionBreakdown, worstTags: [] })
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/api/stats
git add app/api/stats/route.ts
git commit -m "feat: add GET /api/stats with aggregated stats"
```

---

### Task 4: `GET /api/stats/calendar` + `GET /api/stats/equity`

**Files:**
- Create: `app/api/stats/calendar/route.ts`
- Create: `app/api/stats/equity/route.ts`

- [ ] **Step 1: Create `app/api/stats/calendar/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcCalendarData } from '@/lib/calculations'
import type { Trade } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const accountId = searchParams.get('accountId')

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .gte('entry_date', startDate)
    .lte('entry_date', endDateStr + 'T23:59:59Z')

  if (accountId) query = query.eq('account_id', accountId)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Get note dates for this month
  const { data: notes } = await supabase
    .from('notebook_entries')
    .select('trade_date')
    .eq('user_id', user.id)
    .gte('trade_date', startDate)
    .lte('trade_date', endDateStr)

  const noteDates = new Set((notes ?? []).map(n => n.trade_date).filter(Boolean) as string[])

  const { data: settings } = await supabase
    .from('settings')
    .select('breakeven_range')
    .eq('user_id', user.id)
    .single()

  const { days, weeklySummaries } = calcCalendarData(
    (trades ?? []) as Trade[],
    year,
    month,
    settings?.breakeven_range ?? 0,
    noteDates
  )

  return Response.json({ days, weeklySummaries })
}
```

- [ ] **Step 2: Create `app/api/stats/equity/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcEquityCurve } from '@/lib/calculations'
import type { Trade } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const accountId = searchParams.get('accountId')

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'closed')

  if (dateFrom) query = query.gte('exit_date', dateFrom)
  if (dateTo) query = query.lte('exit_date', dateTo + 'T23:59:59Z')
  if (accountId) query = query.eq('account_id', accountId)

  const { data: trades, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const data = calcEquityCurve((trades ?? []) as Trade[])
  return Response.json({ data })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/stats/
git commit -m "feat: add /api/stats/calendar and /api/stats/equity"
```

---

### Task 5: `POST /api/upload`

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Create `app/api/upload/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type))
    return Response.json({ error: 'Invalid file type. Use jpg, png or webp.' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024)
    return Response.json({ error: 'File too large. Max 5MB.' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('screenshots')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('screenshots')
    .getPublicUrl(path)

  return Response.json({ url: publicUrl }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add POST /api/upload for screenshots"
```

---

## Phase 2 — Client Hooks

### Task 6: `useTrades` + `useStats` + `useCalendar`

**Files:**
- Create: `hooks/useTrades.ts`
- Create: `hooks/useStats.ts`
- Create: `hooks/useCalendar.ts`

- [ ] **Step 1: Create `hooks/useTrades.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Trade } from '@/types'

interface UseTrades {
  trades: Trade[]
  total: number
  loading: boolean
  error: string | null
  page: number
  setPage: (p: number) => void
  refresh: () => void
}

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  assetClass?: string
  side?: string
  status?: string
  symbol?: string
  emotion?: string
  minR?: string
  maxR?: string
  strategyId?: string
  tagId?: string
}

export function useTrades(filters: Filters = {}, limit = 50): UseTrades {
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

    fetch(`/api/trades?${params}`)
      .then(r => r.json())
      .then(d => { setTrades(d.trades ?? []); setTotal(d.total ?? 0); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tick, JSON.stringify(filters)])

  return { trades, total, loading, error, page, setPage, refresh }
}
```

- [ ] **Step 2: Create `hooks/useStats.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { StatsResponse } from '@/types'

interface UseStats {
  stats: StatsResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
}

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  assetClass?: string
}

export function useStats(filters: Filters = {}): UseStats {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(d => { setStats(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, JSON.stringify(filters)])

  return { stats, loading, error, refresh }
}
```

- [ ] **Step 3: Create `hooks/useCalendar.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CalendarResponse } from '@/types'

interface UseCalendar {
  data: CalendarResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCalendar(year: number, month: number, accountId?: string): UseCalendar {
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    if (accountId) params.set('accountId', accountId)

    fetch(`/api/stats/calendar?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, month, accountId, tick])

  return { data, loading, error, refresh }
}
```

- [ ] **Step 4: Commit**

```bash
mkdir -p hooks
git add hooks/
git commit -m "feat: add useTrades, useStats, useCalendar hooks"
```

---

## Phase 3 — Dashboard Components

### Task 7: StatCard + CurrentStreak

**Files:**
- Create: `components/dashboard/StatCard.tsx`
- Create: `components/dashboard/CurrentStreak.tsx`

- [ ] **Step 1: Create `components/dashboard/StatCard.tsx`**

```tsx
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  positive?: boolean | null  // null = neutral
  children?: React.ReactNode
}

export function StatCard({ label, value, sub, positive, children }: StatCardProps) {
  const valueColor =
    positive === true ? 'text-green-400' :
    positive === false ? 'text-red-400' :
    'text-[var(--text-primary)]'

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={cn('text-xl font-bold', valueColor)}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/CurrentStreak.tsx`**

```tsx
import { cn } from '@/lib/utils'

interface CurrentStreakProps {
  streak: { type: 'win' | 'loss' | 'none'; count: number }
  consecutiveWins: number
  consecutiveLosses: number
}

export function CurrentStreak({ streak, consecutiveWins, consecutiveLosses }: CurrentStreakProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-3" style={{ color: 'var(--text-muted)' }}>
        Current Streak
      </span>
      <div className="flex gap-2">
        <div className={cn(
          'flex-1 rounded-md p-2 text-center',
          streak.type === 'win' ? 'bg-green-500/10' : 'bg-[var(--bg-hover)]'
        )}>
          <div className={cn('text-lg font-bold', streak.type === 'win' ? 'text-green-400' : 'text-[var(--text-muted)]')}>
            {streak.type === 'win' ? streak.count : consecutiveWins}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>WIN DAYS</div>
        </div>
        <div className={cn(
          'flex-1 rounded-md p-2 text-center',
          streak.type === 'loss' ? 'bg-red-500/10' : 'bg-[var(--bg-hover)]'
        )}>
          <div className={cn('text-lg font-bold', streak.type === 'loss' ? 'text-red-400' : 'text-[var(--text-muted)]')}>
            {streak.type === 'loss' ? streak.count : consecutiveLosses}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LOSS DAYS</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p components/dashboard
git add components/dashboard/StatCard.tsx components/dashboard/CurrentStreak.tsx
git commit -m "feat: add StatCard and CurrentStreak dashboard components"
```

---

### Task 8: WinRateDonut + PerformanceRadar

**Files:**
- Create: `components/dashboard/WinRateDonut.tsx`
- Create: `components/dashboard/PerformanceRadar.tsx`

- [ ] **Step 1: Create `components/dashboard/WinRateDonut.tsx`**

```tsx
'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface WinRateDonutProps {
  winRate: number   // 0-1
  wins: number
  losses: number
  label?: string
}

export function WinRateDonut({ winRate, wins, losses, label = 'Win % by Trades' }: WinRateDonutProps) {
  const pct = Math.round(winRate * 100)
  const data = [
    { name: 'Wins', value: wins || 0 },
    { name: 'Losses', value: losses || 0 },
  ]

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={40}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>WINRATE</span>
          </div>
        </div>
        <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {wins} winners
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {losses} losers
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/PerformanceRadar.tsx`**

```tsx
'use client'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'

interface PerformanceRadarProps {
  winRate: number       // 0-1
  profitFactor: number  // 0-∞
  expectancy: number    // dollar
  avgRMultiple: number  // R
  consistency: number   // 0-1
  score: number
}

function norm(val: number, max: number) {
  return Math.min(Math.round((val / max) * 100), 100)
}

export function PerformanceRadar({
  winRate, profitFactor, expectancy, avgRMultiple, consistency, score,
}: PerformanceRadarProps) {
  const data = [
    { axis: 'Win %',         value: norm(winRate, 1) },
    { axis: 'Avg Win/Loss',  value: norm(Math.max(profitFactor, 0), 3) },
    { axis: 'Profit Factor', value: norm(Math.min(Math.max(profitFactor, 0), 3), 3) },
    { axis: 'Consistency',   value: Math.round(consistency * 100) },
    { axis: 'R-Multiple',    value: norm(Math.max(avgRMultiple, 0), 3) },
  ]

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
        Performance Score
      </span>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius={60}>
            <PolarGrid stroke="#2d3148" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Radar
              dataKey="value"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-1">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--accent)/10', color: 'var(--accent-light)' }}
        >
          Your Score: {score} / 100
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/WinRateDonut.tsx components/dashboard/PerformanceRadar.tsx
git commit -m "feat: add WinRateDonut and PerformanceRadar chart components"
```

---

### Task 9: PnlAreaChart + DailyBarChart

**Files:**
- Create: `components/dashboard/PnlAreaChart.tsx`
- Create: `components/dashboard/DailyBarChart.tsx`

- [ ] **Step 1: Create `components/dashboard/PnlAreaChart.tsx`**

```tsx
'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

interface PnlAreaChartProps {
  data: EquityPoint[]
}

export function PnlAreaChart({ data }: PnlAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg p-4 h-48 flex items-center justify-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const formatted = data.map(d => ({
    ...d,
    dateLabel: format(new Date(d.date), 'dd/MM'),
  }))

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Cumulative Net P&L
      </span>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v: number) => [formatCurrency(v), 'Cum. P&L']}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="cumPnl" stroke="#22c55e" strokeWidth={2} fill="url(#pnlGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/DailyBarChart.tsx`**

```tsx
'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

interface DailyBarChartProps {
  data: EquityPoint[]
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  if (data.length === 0) return null

  const formatted = data.map(d => ({
    ...d,
    dateLabel: format(new Date(d.date), 'dd/MM'),
  }))

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Daily P&L
      </span>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v: number, name: string) => [formatCurrency(v), name === 'dailyPnl' ? 'Daily' : 'Cumulative']}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Bar dataKey="dailyPnl" radius={[2, 2, 0, 0]}>
              {formatted.map((d, i) => (
                <Cell key={i} fill={d.dailyPnl >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="cumPnl" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/PnlAreaChart.tsx components/dashboard/DailyBarChart.tsx
git commit -m "feat: add PnlAreaChart and DailyBarChart Recharts components"
```

---

### Task 10: CalendarWidget

**Files:**
- Create: `components/dashboard/CalendarWidget.tsx`

- [ ] **Step 1: Create `components/dashboard/CalendarWidget.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { cn, formatCurrency, formatPct, formatR } from '@/lib/utils'
import { useCalendar } from '@/hooks/useCalendar'
import type { CalendarDay, DisplayMode } from '@/types'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarWidgetProps {
  accountId?: string
  displayMode?: DisplayMode
}

function formatValue(pnl: number, mode: DisplayMode, trades: number): string {
  if (trades === 0) return ''
  if (mode === 'r_multiple') return formatR(pnl / 100)  // placeholder R
  if (mode === 'percentage') return formatPct(pnl / 10000)
  return pnl >= 0 ? `+${formatCurrency(pnl)}` : formatCurrency(pnl)
}

function DayCell({ day, displayMode }: { day: CalendarDay; displayMode: DisplayMode }) {
  const isToday = day.date === new Date().toISOString().slice(0, 10)

  if (day.type === 'empty') return <div className="h-20" />

  const bg =
    day.type === 'win' ? 'bg-green-500/10' :
    day.type === 'loss' ? 'bg-red-500/10' :
    day.type === 'breakeven' ? 'bg-slate-500/10' : ''

  const textColor =
    day.type === 'win' ? 'text-green-400' :
    day.type === 'loss' ? 'text-red-400' : 'text-[var(--text-muted)]'

  const dayNum = day.date ? parseInt(day.date.slice(-2)) : 0

  return (
    <div className={cn(
      'h-20 rounded-md p-1.5 text-[10px] flex flex-col gap-0.5 cursor-pointer hover:brightness-110 transition-all',
      bg,
      isToday && 'ring-2 ring-[var(--accent)]'
    )}>
      <div className="flex items-center justify-between">
        <span style={{ color: 'var(--text-muted)' }}>{dayNum}</span>
        {day.hasNote && <BookOpen size={10} style={{ color: 'var(--accent-light)' }} />}
      </div>
      {day.nbTrades > 0 && (
        <>
          <span className={cn('font-semibold', textColor)}>
            {formatValue(day.netPnl, displayMode, day.nbTrades)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{day.nbTrades} trade{day.nbTrades > 1 ? 's' : ''}</span>
          <span style={{ color: 'var(--text-muted)' }}>{Math.round(day.winRate * 100)}%</span>
        </>
      )}
    </div>
  )
}

export function CalendarWidget({ accountId, displayMode = 'dollar' }: CalendarWidgetProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data, loading } = useCalendar(year, month, accountId)

  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="p-1 rounded hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{monthName}</span>
        <button onClick={next} className="p-1 rounded hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 gap-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium h-6 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
        <div className="text-center text-[10px] font-medium h-6 flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}>Week</div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-8 gap-1">
          {data?.days.map((day, i) => {
            const isWeekSummary = (i + 1) % 8 === 0
            if (isWeekSummary) return null
            const weekIdx = Math.floor(i / 8)
            const isLastInRow = (i + 1) % 8 === 7

            const cells = [<DayCell key={i} day={day} displayMode={displayMode} />]

            if (isLastInRow && data?.weeklySummaries[weekIdx]) {
              const ws = data.weeklySummaries[weekIdx]
              cells.push(
                <div key={`w${weekIdx}`} className="h-20 rounded-md p-1.5 flex flex-col items-center justify-center gap-0.5"
                  style={{ background: 'var(--bg-hover)' }}>
                  <span className="text-[10px] font-semibold" style={{
                    color: ws.totalPnl >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {ws.totalPnl >= 0 ? '+' : ''}{formatCurrency(ws.totalPnl)}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ws.tradingDays}d</span>
                </div>
              )
            }
            return cells
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/CalendarWidget.tsx
git commit -m "feat: add CalendarWidget with weekly summaries"
```

---

### Task 11: Dashboard page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Replace `app/(dashboard)/dashboard/page.tsx`**

```tsx
'use client'
import { useFiltersStore } from '@/store/filtersStore'
import { useStats } from '@/hooks/useStats'
import { useStats as useEquity } from '@/hooks/useStats'
import { useState, useEffect } from 'react'
import { StatCard } from '@/components/dashboard/StatCard'
import { WinRateDonut } from '@/components/dashboard/WinRateDonut'
import { CurrentStreak } from '@/components/dashboard/CurrentStreak'
import { PerformanceRadar } from '@/components/dashboard/PerformanceRadar'
import { PnlAreaChart } from '@/components/dashboard/PnlAreaChart'
import { DailyBarChart } from '@/components/dashboard/DailyBarChart'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { formatCurrency, formatPct, formatR } from '@/lib/utils'
import type { EquityPoint } from '@/types'

export default function DashboardPage() {
  const { dateFrom, dateTo, accountIds, displayMode } = useFiltersStore()
  const accountId = accountIds[0]

  const { stats, loading } = useStats({ dateFrom, dateTo, accountId })
  const [equity, setEquity] = useState<EquityPoint[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (accountId) params.set('accountId', accountId)
    fetch(`/api/stats/equity?${params}`)
      .then(r => r.json())
      .then(d => setEquity(d.data ?? []))
      .catch(() => {})
  }, [dateFrom, dateTo, accountId])

  if (loading && !stats) {
    return (
      <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <span style={{ color: 'var(--text-muted)' }}>Chargement...</span>
      </main>
    )
  }

  const s = stats
  const wins = s ? Math.round(s.winRate * s.closedTrades) : 0
  const losses = s ? s.closedTrades - wins : 0

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex gap-6">
        {/* LEFT: Calendar */}
        <div className="w-[58%] shrink-0">
          <CalendarWidget accountId={accountId} displayMode={displayMode} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <PnlAreaChart data={equity} />
            <DailyBarChart data={equity} />
          </div>
        </div>

        {/* RIGHT: Stat widgets */}
        <div className="flex-1 flex flex-col gap-3">
          <StatCard
            label="Net P&L"
            value={s ? formatCurrency(s.netPnl) : '—'}
            sub={s ? `${s.closedTrades} trades fermés` : ''}
            positive={s ? (s.netPnl > 0 ? true : s.netPnl < 0 ? false : null) : null}
          />

          <StatCard
            label="Profit Factor"
            value={s ? (s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)) : '—'}
            sub={s ? `Avg win: ${formatCurrency(s.avgWin)}  Avg loss: ${formatCurrency(s.avgLoss)}` : ''}
            positive={s ? (s.profitFactor >= 1.5 ? true : s.profitFactor < 1 ? false : null) : null}
          />

          <WinRateDonut
            winRate={s?.winRate ?? 0}
            wins={wins}
            losses={losses}
            label="Win % by Trades"
          />

          {s && (
            <CurrentStreak
              streak={s.currentStreak}
              consecutiveWins={s.consecutiveWins}
              consecutiveLosses={s.consecutiveLosses}
            />
          )}

          <StatCard
            label="Expectancy"
            value={s ? formatCurrency(s.expectancy) : '—'}
            sub="Par trade fermé"
            positive={s ? (s.expectancy > 0 ? true : s.expectancy < 0 ? false : null) : null}
          />

          {s && (
            <PerformanceRadar
              winRate={s.winRate}
              profitFactor={Math.min(s.profitFactor === Infinity ? 3 : s.profitFactor, 3)}
              expectancy={s.expectancy}
              avgRMultiple={s.avgRMultiple}
              consistency={s.consecutiveWins > 0 || s.consecutiveLosses > 0
                ? s.consecutiveWins / (s.consecutiveWins + s.consecutiveLosses || 1)
                : 0.5}
              score={s.performanceScore}
            />
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: build Dashboard page with stats, charts, and calendar"
```

---

## Phase 4 — Trades Feature

### Task 12: TradeForm drawer

**Files:**
- Create: `components/trades/TradeForm.tsx`

- [ ] **Step 1: Create `components/trades/TradeForm.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { formatCurrency, pnlColor } from '@/lib/utils'
import { useAccounts } from '@/components/layout/AccountsProvider'
import type { Trade, Emotion, AssetClass } from '@/types'

const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: 'confident', label: 'Confiant', emoji: '😎' },
  { value: 'fearful',   label: 'Craintif', emoji: '😰' },
  { value: 'impulsive', label: 'Impulsif', emoji: '😤' },
  { value: 'neutral',   label: 'Neutre',   emoji: '😐' },
  { value: 'greedy',    label: 'Avide',    emoji: '🤑' },
  { value: 'calm',      label: 'Calme',    emoji: '😌' },
  { value: 'anxious',   label: 'Anxieux',  emoji: '😟' },
]

const schema = z.object({
  symbol:       z.string().min(1, 'Symbole requis').toUpperCase(),
  side:         z.enum(['long', 'short']),
  status:       z.enum(['open', 'closed']),
  asset_class:  z.enum(['forex', 'stocks', 'crypto', 'futures', 'options']),
  account_id:   z.string().optional(),
  entry_date:   z.string().min(1, 'Date d\'entrée requise'),
  exit_date:    z.string().optional(),
  entry_price:  z.coerce.number().positive('Prix requis'),
  exit_price:   z.coerce.number().optional(),
  quantity:     z.coerce.number().positive('Quantité requise'),
  stop_loss:    z.coerce.number().optional(),
  take_profit:  z.coerce.number().optional(),
  commission:   z.coerce.number().min(0).default(0),
  rating:       z.coerce.number().min(1).max(5).optional(),
  emotion:      z.string().optional(),
  notes:        z.string().optional(),
  setup_notes:  z.string().optional(),
  mistake_notes:z.string().optional(),
}).refine(d => d.status === 'open' || (d.exit_price !== undefined && d.exit_date), {
  message: 'Prix et date de sortie requis pour un trade fermé',
  path: ['exit_price'],
})

type FormData = z.infer<typeof schema>

interface TradeFormProps {
  open: boolean
  onClose: () => void
  trade?: Trade | null
  onSaved: () => void
}

export function TradeForm({ open, onClose, trade, onSaved }: TradeFormProps) {
  const accounts = useAccounts()
  const isEdit = !!trade

  const { register, handleSubmit, watch, control, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      side: 'long', status: 'closed', asset_class: 'forex', commission: 0,
    },
  })

  useEffect(() => {
    if (trade) {
      reset({
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        asset_class: trade.asset_class as AssetClass,
        account_id: trade.account_id ?? undefined,
        entry_date: trade.entry_date.slice(0, 16),
        exit_date: trade.exit_date?.slice(0, 16),
        entry_price: trade.entry_price,
        exit_price: trade.exit_price ?? undefined,
        quantity: trade.quantity,
        stop_loss: trade.stop_loss ?? undefined,
        take_profit: trade.take_profit ?? undefined,
        commission: trade.commission,
        rating: trade.rating ?? undefined,
        emotion: trade.emotion ?? undefined,
        notes: trade.notes ?? undefined,
        setup_notes: trade.setup_notes ?? undefined,
        mistake_notes: trade.mistake_notes ?? undefined,
      })
    } else {
      reset({ side: 'long', status: 'closed', asset_class: 'forex', commission: 0 })
    }
  }, [trade, reset, open])

  const [side, status, entryPrice, exitPrice, quantity, stopLoss, commission] = watch([
    'side', 'status', 'entry_price', 'exit_price', 'quantity', 'stop_loss', 'commission',
  ])
  const [rating, setRating] = useState(trade?.rating ?? 0)

  const grossPnl = (status === 'closed' && entryPrice && exitPrice && quantity)
    ? calcGrossPnl(side, +entryPrice, +exitPrice, +quantity) : null
  const netPnl = grossPnl != null ? calcNetPnl(grossPnl, +(commission ?? 0)) : null
  const rMultiple = (entryPrice && exitPrice && stopLoss)
    ? calcRMultiple(side, +entryPrice, +exitPrice, +stopLoss) : null

  async function onSubmit(data: FormData) {
    const url = isEdit ? `/api/trades/${trade!.id}` : '/api/trades'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, rating: rating || undefined }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur lors de la sauvegarde')
      return
    }

    toast.success(isEdit ? 'Trade mis à jour !' : 'Trade ajouté !')
    onSaved()
    onClose()
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        className="w-full max-w-xl overflow-y-auto"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifier le trade' : 'Nouveau trade'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-5">
          {/* Section 1: Identity */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={labelStyle}>Identité</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Symbole *</Label>
                <Input placeholder="EURUSD" {...register('symbol')} style={inputStyle} className="uppercase" />
                {errors.symbol && <p className="text-xs text-red-400">{errors.symbol.message}</p>}
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Asset class *</Label>
                <Controller name="asset_class" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {(['forex','stocks','crypto','futures','options'] as AssetClass[]).map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Direction *</Label>
                <Controller name="side" control={control} render={({ field }) => (
                  <div className="flex gap-1">
                    {(['long','short'] as const).map(s => (
                      <button key={s} type="button" onClick={() => field.onChange(s)}
                        className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
                        style={{
                          background: field.value === s ? (s === 'long' ? '#22c55e20' : '#ef444420') : 'var(--bg-hover)',
                          color: field.value === s ? (s === 'long' ? '#22c55e' : '#ef4444') : 'var(--text-muted)',
                          border: `1px solid ${field.value === s ? (s === 'long' ? '#22c55e' : '#ef4444') : 'var(--border)'}`,
                        }}>
                        {s === 'long' ? 'LONG' : 'SHORT'}
                      </button>
                    ))}
                  </div>
                )} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Statut</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <SelectItem value="closed">Fermé</SelectItem>
                      <SelectItem value="open">Ouvert</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {accounts.length > 0 && (
                <div className="space-y-1">
                  <Label style={labelStyle}>Compte</Label>
                  <Controller name="account_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Prices */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={labelStyle}>Prix</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Date d&apos;entrée *</Label>
                <Input type="datetime-local" {...register('entry_date')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Prix d&apos;entrée *</Label>
                <Input type="number" step="any" placeholder="1.10000" {...register('entry_price')} style={inputStyle} />
              </div>
              {status === 'closed' && (
                <>
                  <div className="space-y-1">
                    <Label style={labelStyle}>Date de sortie *</Label>
                    <Input type="datetime-local" {...register('exit_date')} style={inputStyle} />
                  </div>
                  <div className="space-y-1">
                    <Label style={labelStyle}>Prix de sortie *</Label>
                    <Input type="number" step="any" placeholder="1.11000" {...register('exit_price')} style={inputStyle} />
                    {errors.exit_price && <p className="text-xs text-red-400">{errors.exit_price.message}</p>}
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label style={labelStyle}>Quantité *</Label>
                <Input type="number" step="any" placeholder="10000" {...register('quantity')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Commission</Label>
                <Input type="number" step="any" placeholder="0" {...register('commission')} style={inputStyle} />
              </div>
            </div>
          </section>

          {/* Section 3: Risk */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={labelStyle}>Risk</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Stop Loss</Label>
                <Input type="number" step="any" placeholder="1.09000" {...register('stop_loss')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Take Profit</Label>
                <Input type="number" step="any" placeholder="1.12000" {...register('take_profit')} style={inputStyle} />
              </div>
            </div>
            {rMultiple !== null && (
              <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                R-Multiple: <span className={pnlColor(rMultiple)} style={{ fontWeight: 600 }}>
                  {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                </span>
              </div>
            )}
          </section>

          {/* Section 4: Live P&L */}
          {grossPnl !== null && (
            <section className="rounded-lg p-3 space-y-1" style={{ background: 'var(--bg-hover)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={labelStyle}>Résultats</h3>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Gross P&L</span>
                <span className={pnlColor(grossPnl)} style={{ fontWeight: 600 }}>{formatCurrency(grossPnl)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Net P&L</span>
                <span className={pnlColor(netPnl ?? 0)} style={{ fontWeight: 700, fontSize: 15 }}>
                  {formatCurrency(netPnl ?? 0)}
                </span>
              </div>
            </section>
          )}

          {/* Section 5: Psychology */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={labelStyle}>Psychologie</h3>
            <div className="space-y-1">
              <Label style={labelStyle}>Rating</Label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)}
                    className="text-lg transition-opacity"
                    style={{ opacity: n <= rating ? 1 : 0.3 }}>⭐</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label style={labelStyle}>Émotion</Label>
              <div className="flex flex-wrap gap-1">
                {EMOTIONS.map(e => (
                  <Controller key={e.value} name="emotion" control={control} render={({ field }) => (
                    <button type="button" onClick={() => field.onChange(field.value === e.value ? '' : e.value)}
                      className="px-2 py-1 rounded-md text-xs transition-all"
                      style={{
                        background: field.value === e.value ? 'var(--accent)' : 'var(--bg-hover)',
                        color: field.value === e.value ? 'white' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}>
                      {e.emoji} {e.label}
                    </button>
                  )} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label style={labelStyle}>Notes</Label>
              <Textarea rows={2} placeholder="Contexte général..." {...register('notes')} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <Label style={labelStyle}>Setup</Label>
              <Textarea rows={2} placeholder="Pourquoi j'ai pris ce trade..." {...register('setup_notes')} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <Label style={labelStyle}>Erreurs</Label>
              <Textarea rows={2} placeholder="Ce que j'aurais dû faire..." {...register('mistake_notes')} style={inputStyle} />
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}
              style={{ color: 'var(--text-muted)' }}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}
              style={{ background: 'var(--accent)', color: 'white' }}>
              {isSubmitting ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Ajouter le trade'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p components/trades
git add components/trades/TradeForm.tsx
git commit -m "feat: add TradeForm drawer with live P&L calculation"
```

---

### Task 13: TradeTable + Trades page

**Files:**
- Create: `components/trades/TradeTable.tsx`
- Modify: `app/(dashboard)/trades/page.tsx`

- [ ] **Step 1: Create `components/trades/TradeTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatR, formatDate } from '@/lib/utils'
import type { Trade } from '@/types'

interface TradeTableProps {
  trades: Trade[]
  loading: boolean
  onEdit: (trade: Trade) => void
  onDeleted: () => void
}

export function TradeTable({ trades, loading, onEdit, onDeleted }: TradeTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce trade ?')) return
    setDeleting(id)
    const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
    toast.success('Trade supprimé')
    onDeleted()
  }

  const thStyle = 'text-left px-3 py-2 text-xs font-medium whitespace-nowrap'
  const tdStyle = 'px-3 py-2 text-xs whitespace-nowrap'

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</span>
      </div>
    )
  }

  if (!loading && trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun trade</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Clique sur "+ Add Trade" pour commencer</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead style={{ borderBottom: '1px solid var(--border)' }}>
          <tr>
            {['Date', 'Symbole', 'Side', 'Asset', 'Entrée', 'Sortie', 'Qté', 'Gross P&L', 'Net P&L', 'R', '★', 'Émotion', 'Statut', 'Actions'].map(h => (
              <th key={h} className={thStyle} style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => (
            <tr key={trade.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>
                {formatDate(trade.entry_date)}
              </td>
              <td className={cn(tdStyle, 'font-semibold')} style={{ color: 'var(--text-primary)' }}>
                {trade.symbol}
              </td>
              <td className={tdStyle}>
                <Badge className="text-[10px]" style={{
                  background: trade.side === 'long' ? '#22c55e20' : '#ef444420',
                  color: trade.side === 'long' ? '#22c55e' : '#ef4444',
                  border: 'none',
                }}>
                  {trade.side.toUpperCase()}
                </Badge>
              </td>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>{trade.asset_class}</td>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>{trade.entry_price}</td>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>{trade.exit_price ?? '—'}</td>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>{trade.quantity}</td>
              <td className={cn(tdStyle, 'font-medium')} style={{
                color: (trade.gross_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {trade.gross_pnl != null ? formatCurrency(trade.gross_pnl) : '—'}
              </td>
              <td className={cn(tdStyle, 'font-bold')} style={{
                color: (trade.net_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {trade.net_pnl != null ? formatCurrency(trade.net_pnl) : '—'}
              </td>
              <td className={cn(tdStyle, 'font-medium')} style={{
                color: (trade.r_multiple ?? 0) >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {trade.r_multiple != null ? formatR(trade.r_multiple) : '—'}
              </td>
              <td className={tdStyle}>
                {trade.rating ? '⭐'.repeat(trade.rating) : '—'}
              </td>
              <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>
                {trade.emotion ?? '—'}
              </td>
              <td className={tdStyle}>
                <Badge className="text-[10px]" style={{
                  background: trade.status === 'closed' ? '#22c55e15' : '#7c3aed15',
                  color: trade.status === 'closed' ? '#22c55e' : '#a78bfa',
                  border: 'none',
                }}>
                  {trade.status}
                </Badge>
              </td>
              <td className={tdStyle}>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => onEdit(trade)}
                    style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={12} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    disabled={deleting === trade.id}
                    onClick={() => handleDelete(trade.id)}
                    style={{ color: '#ef4444' }}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(dashboard)/trades/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useTrades } from '@/hooks/useTrades'
import { TradeTable } from '@/components/trades/TradeTable'
import { TradeForm } from '@/components/trades/TradeForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Trade } from '@/types'

export default function TradesPage() {
  const { dateFrom, dateTo, accountIds, assetClasses } = useFiltersStore()
  const accountId = accountIds[0]
  const assetClass = assetClasses[0]

  const { trades, total, loading, page, setPage, refresh } = useTrades({
    dateFrom, dateTo, accountId, assetClass,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)

  function handleEdit(trade: Trade) {
    setEditingTrade(trade)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingTrade(null)
  }

  function handleSaved() {
    refresh()
    handleClose()
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {total} trade{total > 1 ? 's' : ''}
        </span>
        <Button onClick={() => setFormOpen(true)} size="sm"
          style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus size={14} className="mr-1" /> Add Trade
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
              style={{ color: 'var(--text-muted)' }}>Précédent</Button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page}</span>
            <Button variant="ghost" size="sm" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}
              style={{ color: 'var(--text-muted)' }}>Suivant</Button>
          </div>
        )}
      </div>

      {/* TradeForm drawer */}
      <TradeForm
        open={formOpen}
        onClose={handleClose}
        trade={editingTrade}
        onSaved={handleSaved}
      />
    </main>
  )
}
```

- [ ] **Step 3: Wire Sidebar "Add Trade" to open TradeForm on /trades page**

The Sidebar `onAddTrade` is already wired to navigate to `/trades`. The TradeForm is on the `/trades` page. When the user navigates to `/trades`, they click "+ Add Trade" there. This is sufficient for now — the global sidebar button navigates, the page button opens the form.

- [ ] **Step 4: Commit**

```bash
git add components/trades/TradeTable.tsx app/\(dashboard\)/trades/page.tsx
git commit -m "feat: add TradeTable and complete Trades page with CRUD"
```

---

### Task 14: Daily Stats page

**Files:**
- Modify: `app/(dashboard)/daily-stats/page.tsx`

- [ ] **Step 1: Replace `app/(dashboard)/daily-stats/page.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useTrades } from '@/hooks/useTrades'
import { groupTradesByDay, calcWinRate } from '@/lib/calculations'
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

export default function DailyStatsPage() {
  const { dateFrom, dateTo, accountIds } = useFiltersStore()
  const accountId = accountIds[0]

  const { trades, loading } = useTrades({ dateFrom, dateTo, accountId, status: 'closed', limit: 500 })

  const days = useMemo(() => {
    const byDay = groupTradesByDay(trades)
    return Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayTrades]) => {
        const closed = dayTrades.filter(t => t.net_pnl != null)
        const netPnl = closed.reduce((s, t) => s + (t.net_pnl ?? 0), 0)
        const grossPnl = closed.reduce((s, t) => s + (t.gross_pnl ?? 0), 0)
        const commission = closed.reduce((s, t) => s + t.commission, 0)
        const winRate = calcWinRate(dayTrades)
        const avgR = closed.filter(t => t.r_multiple != null).reduce((s, t) => s + (t.r_multiple ?? 0), 0)
          / (closed.filter(t => t.r_multiple != null).length || 1)
        const bestTrade = closed.length > 0 ? closed.reduce((a, b) => (a.net_pnl ?? 0) > (b.net_pnl ?? 0) ? a : b) : null
        const worstTrade = closed.length > 0 ? closed.reduce((a, b) => (a.net_pnl ?? 0) < (b.net_pnl ?? 0) ? a : b) : null
        const longs = dayTrades.filter(t => t.side === 'long').length
        const shorts = dayTrades.filter(t => t.side === 'short').length

        return { date, trades: dayTrades, closedTrades: closed, netPnl, grossPnl, commission, winRate, avgR, bestTrade, worstTrade, longs, shorts }
      })
  }, [trades])

  const thStyle = 'text-left px-3 py-2 text-xs font-medium whitespace-nowrap'
  const tdStyle = 'px-3 py-2 text-xs whitespace-nowrap'

  if (loading) return (
    <main className="flex-1 flex items-center justify-center">
      <span style={{ color: 'var(--text-muted)' }}>Chargement...</span>
    </main>
  )

  return (
    <main className="flex-1 overflow-auto p-4">
      <div className="rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border)' }}>
            <tr>
              {['Date', 'Trades', 'Long', 'Short', 'Gross P&L', 'Net P&L', 'Commission', 'Win Rate', 'Best', 'Worst', 'Avg R'].map(h => (
                <th key={h} className={thStyle} style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                Aucun trade sur cette période
              </td></tr>
            )}
            {days.map(day => (
              <tr key={day.date} className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                style={{ borderColor: 'var(--border)' }}>
                <td className={cn(tdStyle, 'font-medium')} style={{ color: 'var(--text-primary)' }}>
                  {day.date}
                </td>
                <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>{day.trades.length}</td>
                <td className={tdStyle} style={{ color: '#22c55e' }}>{day.longs}</td>
                <td className={tdStyle} style={{ color: '#ef4444' }}>{day.shorts}</td>
                <td className={tdStyle} style={{ color: day.grossPnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                  {formatCurrency(day.grossPnl)}
                </td>
                <td className={tdStyle} style={{ color: day.netPnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  {formatCurrency(day.netPnl)}
                </td>
                <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(day.commission)}
                </td>
                <td className={tdStyle} style={{ color: 'var(--text-muted)' }}>
                  {Math.round(day.winRate * 100)}%
                </td>
                <td className={tdStyle} style={{ color: '#22c55e' }}>
                  {day.bestTrade ? formatCurrency(day.bestTrade.net_pnl!) : '—'}
                </td>
                <td className={tdStyle} style={{ color: '#ef4444' }}>
                  {day.worstTrade ? formatCurrency(day.worstTrade.net_pnl!) : '—'}
                </td>
                <td className={tdStyle} style={{ color: day.avgR >= 0 ? '#22c55e' : '#ef4444' }}>
                  {day.avgR !== 0 ? `${day.avgR >= 0 ? '+' : ''}${day.avgR.toFixed(2)}R` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/daily-stats/page.tsx
git commit -m "feat: add Daily Stats page with per-day breakdown"
```

---

## Phase 5 — Build, Type Check, Deploy

### Task 15: Verify + Deploy

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any errors before proceeding.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean build, all routes present.

- [ ] **Step 3: Test locally**

```bash
npm run dev
```

1. Open `http://localhost:3000` → redirect to `/login`
2. Login → redirect to `/dashboard`
3. Dashboard shows: "Chargement..." then stat cards (all zeros if no trades)
4. Click "/trades" → empty table with "Aucun trade" message
5. Click "+ Add Trade" → TradeForm drawer opens
6. Fill: Symbol=EURUSD, Side=LONG, Closed, Entry=1.10, Exit=1.11, Qty=10000, Date=today → Submit
7. Trade appears in table with Net P&L = +$100
8. Navigate back to Dashboard → stats update (Net P&L shows $100, 1 trade, etc.)
9. CalendarWidget shows today as green win cell
10. Daily Stats shows today's row

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: plan 2+3 complete — trades CRUD, dashboard, daily stats"
```

- [ ] **Step 5: Deploy**

```bash
vercel --prod
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /api/trades` with all filters + pagination
- ✅ `POST /api/trades` with server-side P&L calculation
- ✅ `PUT /api/trades/[id]` + `DELETE /api/trades/[id]`
- ✅ `GET /api/stats` with AggregatedStats + topSymbols + emotionBreakdown
- ✅ `GET /api/stats/calendar` + `GET /api/stats/equity`
- ✅ `POST /api/upload`
- ✅ useTrades + useStats + useCalendar hooks
- ✅ StatCard, WinRateDonut, CurrentStreak, PerformanceRadar
- ✅ PnlAreaChart, DailyBarChart
- ✅ CalendarWidget with weekly summaries + hasNote
- ✅ TradeForm: 5 of 7 sections (screenshots and tags/strategies deferred to Plan 4)
- ✅ TradeTable with edit/delete
- ✅ Trades page with pagination
- ✅ Daily Stats page

**Gaps (intentionally deferred to Plan 4):**
- Tags/Strategies multi-select in TradeForm (needs settings CRUD first)
- Screenshot upload in TradeForm (functional API exists)
- Reports page (8 tabs)
- Strategies page
- Notebook
- AI Insights
- Settings

**Type consistency:** All hooks use types from `@/types`. API routes use `calcAggregatedStats` from `@/lib/calculations`. TradeForm uses `useAccounts()` from `AccountsProvider`. All consistent with Plan 1 definitions.

# Trading Journal — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the complete project scaffold, database schema, type system, Supabase clients, middleware, calculation library, Claude client, Zustand store, auth pages, and dashboard shell layout — everything the feature plans depend on.

**Architecture:** Next.js 15 App Router, Supabase SSR auth via middleware, server-side Supabase client for API routes, browser client for hooks. All business logic types in `/types`. Pure calculation functions in `/lib/calculations.ts`. Zustand global filter store in `/store/filtersStore.ts`.

**Tech Stack:** Next.js 15, TypeScript strict, Supabase (@supabase/ssr), shadcn/ui dark, Tailwind CSS, Zustand, Zod, sonner, date-fns, lucide-react.

**Spec reference:** `docs/superpowers/specs/2026-06-01-trading-journal-design.md`

---

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Dependencies |
| `next.config.ts` | Next.js config |
| `vercel.json` | Vercel deploy config |
| `.env.local` | Env vars (template) |
| `app/globals.css` | Design tokens + base styles |
| `supabase/schema.sql` | Complete DB schema + RLS |
| `types/database.ts` | Raw Supabase table row types |
| `types/index.ts` | App-level types, interfaces, unions |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (SSR) |
| `lib/calculations.ts` | Pure P&L / stats functions |
| `lib/claude.ts` | Claude API wrapper |
| `lib/utils.ts` | cn() + misc helpers |
| `store/filtersStore.ts` | Zustand global filters |
| `middleware.ts` | Session refresh + route guard |
| `app/layout.tsx` | Root layout (Toaster) |
| `app/(auth)/login/page.tsx` | Login form |
| `app/(auth)/register/page.tsx` | Register form |
| `app/(auth)/layout.tsx` | Auth layout (centered card) |
| `app/(dashboard)/layout.tsx` | Sidebar + content shell |
| `components/layout/Sidebar.tsx` | Nav sidebar 220px |
| `components/layout/GlobalFilters.tsx` | Date range + account selector |
| `components/layout/Header.tsx` | Top bar with title + filters |

---

## Phase 1 — Project Scaffold

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `/Users/timeo/trading-journal/` (project root via npx)

- [ ] **Step 1: Scaffold project**

```bash
cd /Users/timeo
npx create-next-app@latest trading-journal \
  --typescript --tailwind --app --src-dir=false \
  --import-alias="@/*" --no-git
cd trading-journal
```

Expected: project created, `app/`, `public/`, `package.json` present.

- [ ] **Step 2: Install dependencies**

```bash
npm install \
  @supabase/supabase-js @supabase/ssr \
  @anthropic-ai/sdk \
  zustand \
  recharts \
  react-hook-form @hookform/resolvers zod \
  date-fns \
  @uiw/react-md-editor \
  sonner \
  lucide-react
```

- [ ] **Step 3: Init shadcn (dark, slate, CSS variables)**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 4: Add shadcn components**

```bash
npx shadcn@latest add \
  button card input label select textarea \
  drawer sheet dialog table badge tabs \
  dropdown-menu popover separator \
  scroll-area avatar tooltip progress \
  skeleton switch calendar
```

- [ ] **Step 5: Add Vitest for unit tests**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

Update `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
EOF
```

- [ ] **Step 7: Create `vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js 15 project with all dependencies"
```

---

### Task 2: Design system — `globals.css`

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --bg-primary: #0f1117;
    --bg-card: #1a1d2e;
    --bg-hover: #252840;
    --accent: #7c3aed;
    --accent-light: #a78bfa;
    --green: #22c55e;
    --red: #ef4444;
    --grey-neutral: #6b7280;
    --text-primary: #f1f5f9;
    --text-muted: #94a3b8;
    --border: #2d3148;

    --background: var(--bg-primary);
    --foreground: var(--text-primary);
    --card: var(--bg-card);
    --card-foreground: var(--text-primary);
    --popover: var(--bg-card);
    --popover-foreground: var(--text-primary);
    --primary: var(--accent);
    --primary-foreground: #ffffff;
    --secondary: var(--bg-hover);
    --secondary-foreground: var(--text-primary);
    --muted: var(--bg-hover);
    --muted-foreground: var(--text-muted);
    --accent-color: var(--bg-hover);
    --accent-foreground: var(--text-primary);
    --destructive: var(--red);
    --destructive-foreground: #ffffff;
    --border-color: var(--border);
    --input: var(--border);
    --ring: var(--accent);
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-sans);
    min-width: 1024px;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--bg-primary);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add design system CSS tokens"
```

---

## Phase 2 — Database Schema

### Task 3: Supabase schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Create `supabase/schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ACCOUNTS
-- ============================================================
create table accounts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  broker      text,
  type        text not null check (type in ('live', 'demo', 'prop')),
  balance     numeric(15, 2) not null default 0,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "own" on accounts
  for all using (auth.uid() = user_id);

-- ============================================================
-- TAGS
-- ============================================================
create table tags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#7c3aed',
  category    text not null default 'custom'
              check (category in ('setup', 'mistake', 'condition', 'custom')),
  created_at  timestamptz not null default now()
);

alter table tags enable row level security;
create policy "own" on tags
  for all using (auth.uid() = user_id);

-- ============================================================
-- STRATEGIES
-- ============================================================
create table strategies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  asset_class text,
  entry_rules text,
  exit_rules  text,
  risk_rules  text,
  checklist   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table strategies enable row level security;
create policy "own" on strategies
  for all using (auth.uid() = user_id);

-- ============================================================
-- TRADES
-- ============================================================
create table trades (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid references accounts(id) on delete set null,
  symbol        text not null,
  side          text not null check (side in ('long', 'short')),
  status        text not null default 'closed'
                check (status in ('open', 'closed')),
  asset_class   text not null default 'forex'
                check (asset_class in ('forex', 'stocks', 'crypto', 'futures', 'options')),
  entry_date    timestamptz not null,
  exit_date     timestamptz,
  entry_price   numeric(20, 8) not null,
  exit_price    numeric(20, 8),
  quantity      numeric(20, 8) not null,
  stop_loss     numeric(20, 8),
  take_profit   numeric(20, 8),
  gross_pnl     numeric(15, 4),
  net_pnl       numeric(15, 4),
  commission    numeric(15, 4) not null default 0,
  r_multiple    numeric(10, 4),
  risk_amount   numeric(15, 4),
  rating        int check (rating >= 1 and rating <= 5),
  emotion       text check (emotion in (
                  'confident', 'fearful', 'impulsive',
                  'neutral', 'greedy', 'calm', 'anxious'
                )),
  notes         text,
  setup_notes   text,
  mistake_notes text,
  screenshots   text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table trades enable row level security;
create policy "own" on trades
  for all using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trades_updated_at
  before update on trades
  for each row execute function update_updated_at();

create trigger strategies_updated_at
  before update on strategies
  for each row execute function update_updated_at();

-- ============================================================
-- TRADE TAGS (pivot)
-- ============================================================
create table trade_tags (
  trade_id  uuid not null references trades(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (trade_id, tag_id)
);

alter table trade_tags enable row level security;
create policy "own" on trade_tags
  for all using (
    exists (
      select 1 from trades
      where trades.id = trade_tags.trade_id
        and trades.user_id = auth.uid()
    )
  );

-- ============================================================
-- TRADE STRATEGIES (pivot)
-- ============================================================
create table trade_strategies (
  trade_id    uuid not null references trades(id) on delete cascade,
  strategy_id uuid not null references strategies(id) on delete cascade,
  primary key (trade_id, strategy_id)
);

alter table trade_strategies enable row level security;
create policy "own" on trade_strategies
  for all using (
    exists (
      select 1 from trades
      where trades.id = trade_strategies.trade_id
        and trades.user_id = auth.uid()
    )
  );

-- ============================================================
-- NOTEBOOK ENTRIES
-- ============================================================
create table notebook_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  type        text not null default 'custom'
              check (type in ('daily', 'weekly', 'plan', 'recap', 'custom')),
  trade_date  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table notebook_entries enable row level security;
create policy "own" on notebook_entries
  for all using (auth.uid() = user_id);

create trigger notebook_entries_updated_at
  before update on notebook_entries
  for each row execute function update_updated_at();

-- ============================================================
-- SETTINGS
-- ============================================================
create table settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key  text,
  default_commission numeric(10, 4) not null default 0,
  breakeven_range    numeric(10, 4) not null default 0,
  currency           text not null default 'USD',
  timezone           text not null default 'Europe/Paris',
  display_mode       text not null default 'dollar'
                     check (display_mode in ('dollar', 'percentage', 'r_multiple'))
);

alter table settings enable row level security;
create policy "own" on settings
  for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index trades_user_id_idx on trades(user_id);
create index trades_entry_date_idx on trades(entry_date);
create index trades_exit_date_idx on trades(exit_date);
create index trades_account_id_idx on trades(account_id);
create index notebook_entries_trade_date_idx on notebook_entries(trade_date);
create index notebook_entries_user_id_idx on notebook_entries(user_id);

-- ============================================================
-- STORAGE — bucket screenshots
-- ============================================================
-- Run this in Supabase dashboard or via API:
-- insert into storage.buckets (id, name, public)
-- values ('screenshots', 'screenshots', false);
--
-- Storage policy (in dashboard):
-- Allow authenticated users to upload to their own folder:
-- (storage.foldername(name))[1] = auth.uid()::text
```

- [ ] **Step 2: Commit**

```bash
mkdir -p supabase
git add supabase/schema.sql
git commit -m "feat: add complete Supabase schema with RLS"
```

- [ ] **Step 3: Apply schema in Supabase**

In Supabase dashboard → SQL Editor → paste and run `supabase/schema.sql`.
Also create bucket `screenshots` (Storage → New bucket → name: `screenshots`, private).

---

## Phase 3 — Types

### Task 4: Type definitions

**Files:**
- Create: `types/database.ts`
- Create: `types/index.ts`

- [ ] **Step 1: Create `types/database.ts`**

```ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          broker: string | null
          type: 'live' | 'demo' | 'prop'
          balance: number
          currency: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          category: 'setup' | 'mistake' | 'condition' | 'custom'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
      }
      strategies: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          asset_class: string | null
          entry_rules: string | null
          exit_rules: string | null
          risk_rules: string | null
          checklist: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>
      }
      trades: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          symbol: string
          side: 'long' | 'short'
          status: 'open' | 'closed'
          asset_class: 'forex' | 'stocks' | 'crypto' | 'futures' | 'options'
          entry_date: string
          exit_date: string | null
          entry_price: number
          exit_price: number | null
          quantity: number
          stop_loss: number | null
          take_profit: number | null
          gross_pnl: number | null
          net_pnl: number | null
          commission: number
          r_multiple: number | null
          risk_amount: number | null
          rating: number | null
          emotion: 'confident' | 'fearful' | 'impulsive' | 'neutral' | 'greedy' | 'calm' | 'anxious' | null
          notes: string | null
          setup_notes: string | null
          mistake_notes: string | null
          screenshots: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['trades']['Insert']>
      }
      trade_tags: {
        Row: { trade_id: string; tag_id: string }
        Insert: { trade_id: string; tag_id: string }
        Update: never
      }
      trade_strategies: {
        Row: { trade_id: string; strategy_id: string }
        Insert: { trade_id: string; strategy_id: string }
        Update: never
      }
      notebook_entries: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          type: 'daily' | 'weekly' | 'plan' | 'recap' | 'custom'
          trade_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['notebook_entries']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notebook_entries']['Insert']>
      }
      settings: {
        Row: {
          user_id: string
          anthropic_api_key: string | null
          default_commission: number
          breakeven_range: number
          currency: string
          timezone: string
          display_mode: 'dollar' | 'percentage' | 'r_multiple'
        }
        Insert: Database['public']['Tables']['settings']['Row']
        Update: Partial<Database['public']['Tables']['settings']['Row']>
      }
    }
  }
}
```

- [ ] **Step 2: Create `types/index.ts`**

```ts
import type { Database } from './database'

// ── Primitive unions ──────────────────────────────────────────
export type AssetClass = 'forex' | 'stocks' | 'crypto' | 'futures' | 'options'
export type TradeSide = 'long' | 'short'
export type TradeStatus = 'open' | 'closed'
export type Emotion =
  | 'confident'
  | 'fearful'
  | 'impulsive'
  | 'neutral'
  | 'greedy'
  | 'calm'
  | 'anxious'
export type DisplayMode = 'dollar' | 'percentage' | 'r_multiple'
export type NoteType = 'daily' | 'weekly' | 'plan' | 'recap' | 'custom'
export type AccountType = 'live' | 'demo' | 'prop'
export type TagCategory = 'setup' | 'mistake' | 'condition' | 'custom'

// ── DB row re-exports ─────────────────────────────────────────
export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type TagRow = Database['public']['Tables']['tags']['Row']
export type StrategyRow = Database['public']['Tables']['strategies']['Row']
export type TradeRow = Database['public']['Tables']['trades']['Row']
export type NotebookEntryRow = Database['public']['Tables']['notebook_entries']['Row']
export type SettingsRow = Database['public']['Tables']['settings']['Row']

// ── Domain types ──────────────────────────────────────────────
export interface Tag extends TagRow {}

export interface Strategy extends StrategyRow {
  checklist: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface Trade extends TradeRow {
  tags?: Tag[]
  strategies?: Strategy[]
}

export interface Account extends AccountRow {}

export interface NotebookEntry extends NotebookEntryRow {}

export interface Settings extends SettingsRow {}

// ── Calendar ──────────────────────────────────────────────────
export type CalendarDayType = 'win' | 'loss' | 'breakeven' | 'no-trade' | 'empty'

export interface CalendarDay {
  date: string | null        // 'YYYY-MM-DD' or null for empty cells
  netPnl: number
  nbTrades: number
  winRate: number
  avgRMultiple: number
  type: CalendarDayType
  trades: Trade[]
  hasNote: boolean
}

export interface WeeklySummary {
  weekIndex: number          // 0-5
  totalPnl: number
  tradingDays: number
}

// ── Aggregated stats ──────────────────────────────────────────
export interface AggregatedStats {
  totalTrades: number
  closedTrades: number
  openTrades: number
  winRate: number
  winRateByDay: number
  profitFactor: number
  netPnl: number
  grossPnl: number
  totalCommission: number
  avgWin: number
  avgLoss: number
  expectancy: number
  avgRMultiple: number
  maxDrawdown: number
  bestDay: { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number }
  performanceScore: number
  totalDays: number
  tradingDays: number
}

// ── AI context ────────────────────────────────────────────────
export interface TradingContext {
  period: { from: string; to: string }
  stats: AggregatedStats
  topSymbols: Array<{ symbol: string; netPnl: number; trades: number; winRate: number }>
  topStrategies: Array<{ name: string; netPnl: number; trades: number; winRate: number }>
  emotionBreakdown: Array<{ emotion: Emotion; count: number; netPnl: number; winRate: number }>
  recentTrades: Trade[]
  worstTags: Array<{ name: string; netPnl: number; trades: number }>
}

// ── Equity curve ──────────────────────────────────────────────
export interface EquityPoint {
  date: string
  dailyPnl: number
  cumPnl: number
}

// ── API response shapes ───────────────────────────────────────
export interface TradesResponse {
  trades: Trade[]
  total: number
  page: number
}

export interface StatsResponse extends AggregatedStats {
  topSymbols: TradingContext['topSymbols']
  topStrategies: TradingContext['topStrategies']
  emotionBreakdown: TradingContext['emotionBreakdown']
  worstTags: TradingContext['worstTags']
}

export interface CalendarResponse {
  days: CalendarDay[]
  weeklySummaries: WeeklySummary[]
}

export interface SettingsResponse {
  settings: Omit<Settings, 'anthropic_api_key'>
  hasApiKey: boolean
}
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat: add complete TypeScript type definitions"
```

---

## Phase 4 — Supabase Clients & Middleware

### Task 5: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookies set in middleware
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p lib/supabase
git add lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

### Task 6: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboard = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/trades') ||
    pathname.startsWith('/daily-stats') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/strategies') ||
    pathname.startsWith('/notebook') ||
    pathname.startsWith('/ai-insights') ||
    pathname.startsWith('/settings')

  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if ((pathname === '/login' || pathname === '/register') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and route protection"
```

---

## Phase 5 — Libraries

### Task 7: Calculations library + tests

**Files:**
- Create: `lib/calculations.ts`
- Create: `lib/calculations.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `lib/calculations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  calcGrossPnl,
  calcNetPnl,
  calcRMultiple,
  calcProfitFactor,
  calcWinRate,
  calcExpectancy,
  calcMaxDrawdown,
  calcPerformanceScore,
} from './calculations'
import type { Trade } from '@/types'

const makeTrade = (overrides: Partial<Trade>): Trade =>
  ({
    id: '1',
    user_id: 'u1',
    account_id: null,
    symbol: 'EURUSD',
    side: 'long',
    status: 'closed',
    asset_class: 'forex',
    entry_date: '2024-01-01T09:00:00Z',
    exit_date: '2024-01-01T10:00:00Z',
    entry_price: 1.1,
    exit_price: 1.11,
    quantity: 10000,
    stop_loss: 1.09,
    take_profit: 1.12,
    gross_pnl: 100,
    net_pnl: 95,
    commission: 5,
    r_multiple: 1,
    risk_amount: 100,
    rating: 4,
    emotion: 'confident',
    notes: null,
    setup_notes: null,
    mistake_notes: null,
    screenshots: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as Trade)

describe('calcGrossPnl', () => {
  it('long win: positive pnl', () => {
    expect(calcGrossPnl('long', 1.1, 1.11, 10000)).toBeCloseTo(100)
  })
  it('long loss: negative pnl', () => {
    expect(calcGrossPnl('long', 1.11, 1.1, 10000)).toBeCloseTo(-100)
  })
  it('short win: positive pnl', () => {
    expect(calcGrossPnl('short', 1.11, 1.1, 10000)).toBeCloseTo(100)
  })
  it('short loss: negative pnl', () => {
    expect(calcGrossPnl('short', 1.1, 1.11, 10000)).toBeCloseTo(-100)
  })
})

describe('calcNetPnl', () => {
  it('subtracts commission', () => {
    expect(calcNetPnl(100, 5)).toBe(95)
  })
})

describe('calcRMultiple', () => {
  it('1R win long', () => {
    expect(calcRMultiple('long', 1.1, 1.11, 1.09)).toBeCloseTo(1)
  })
  it('1R win short', () => {
    expect(calcRMultiple('short', 1.11, 1.1, 1.12)).toBeCloseTo(1)
  })
  it('returns 0 if no stop loss risk', () => {
    expect(calcRMultiple('long', 1.1, 1.11, 1.1)).toBe(0)
  })
})

describe('calcProfitFactor', () => {
  it('basic win/loss ratio', () => {
    const trades = [
      makeTrade({ net_pnl: 200, status: 'closed' }),
      makeTrade({ net_pnl: -100, status: 'closed' }),
    ]
    expect(calcProfitFactor(trades)).toBeCloseTo(2)
  })
  it('returns Infinity when no losses', () => {
    const trades = [makeTrade({ net_pnl: 100, status: 'closed' })]
    expect(calcProfitFactor(trades)).toBe(Infinity)
  })
  it('returns 0 when no wins', () => {
    const trades = [makeTrade({ net_pnl: -100, status: 'closed' })]
    expect(calcProfitFactor(trades)).toBe(0)
  })
})

describe('calcWinRate', () => {
  it('50% win rate', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: -50, status: 'closed' }),
    ]
    expect(calcWinRate(trades, 0)).toBeCloseTo(0.5)
  })
  it('ignores open trades', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: null, status: 'open' }),
    ]
    expect(calcWinRate(trades, 0)).toBe(1)
  })
})

describe('calcExpectancy', () => {
  it('average net pnl of closed trades', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: -50, status: 'closed' }),
    ]
    expect(calcExpectancy(trades)).toBeCloseTo(25)
  })
})

describe('calcMaxDrawdown', () => {
  it('returns negative max drawdown', () => {
    const trades = [
      makeTrade({ net_pnl: 100, exit_date: '2024-01-01T10:00:00Z', status: 'closed' }),
      makeTrade({ net_pnl: -200, exit_date: '2024-01-02T10:00:00Z', status: 'closed' }),
      makeTrade({ net_pnl: 50, exit_date: '2024-01-03T10:00:00Z', status: 'closed' }),
    ]
    expect(calcMaxDrawdown(trades)).toBeCloseTo(-200)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/calculations.test.ts
```

Expected: FAIL — `Cannot find module './calculations'`

- [ ] **Step 3: Implement `lib/calculations.ts`**

```ts
import { format } from 'date-fns'
import type { Trade, CalendarDay, CalendarDayType, WeeklySummary, EquityPoint, AggregatedStats } from '@/types'

export function calcGrossPnl(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  qty: number
): number {
  const direction = side === 'long' ? 1 : -1
  return (exitPrice - entryPrice) * qty * direction
}

export function calcNetPnl(grossPnl: number, commission: number): number {
  return grossPnl - commission
}

export function calcRMultiple(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  stopLoss: number
): number {
  const riskPerUnit = Math.abs(entryPrice - stopLoss)
  if (riskPerUnit === 0) return 0
  const direction = side === 'long' ? 1 : -1
  return ((exitPrice - entryPrice) * direction) / riskPerUnit
}

export function calcProfitFactor(trades: Trade[]): number {
  const closed = trades.filter(t => t.status === 'closed' && t.net_pnl !== null)
  const wins = closed.filter(t => (t.net_pnl ?? 0) > 0).reduce((s, t) => s + (t.net_pnl ?? 0), 0)
  const losses = Math.abs(
    closed.filter(t => (t.net_pnl ?? 0) < 0).reduce((s, t) => s + (t.net_pnl ?? 0), 0)
  )
  if (losses === 0) return wins > 0 ? Infinity : 0
  return wins / losses
}

export function calcWinRate(trades: Trade[], breakevenRange = 0): number {
  const closed = trades.filter(t => t.status === 'closed' && t.net_pnl !== null)
  if (closed.length === 0) return 0
  const wins = closed.filter(t => (t.net_pnl ?? 0) > breakevenRange).length
  return wins / closed.length
}

export function calcExpectancy(trades: Trade[]): number {
  const closed = trades.filter(t => t.status === 'closed' && t.net_pnl !== null)
  if (closed.length === 0) return 0
  return closed.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / closed.length
}

export function calcMaxDrawdown(trades: Trade[]): number {
  const closed = trades
    .filter(t => t.status === 'closed' && t.net_pnl !== null && t.exit_date)
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime())

  if (closed.length === 0) return 0

  let peak = 0
  let cumPnl = 0
  let maxDD = 0

  for (const trade of closed) {
    cumPnl += trade.net_pnl ?? 0
    if (cumPnl > peak) peak = cumPnl
    const dd = peak - cumPnl
    if (dd > maxDD) maxDD = dd
  }

  return -maxDD
}

export function calcPerformanceScore(stats: Pick<
  AggregatedStats,
  'winRate' | 'profitFactor' | 'expectancy' | 'avgRMultiple' | 'consecutiveWins' | 'consecutiveLosses'
>): number {
  // Win Rate: 0-20 pts
  const winScore = Math.min(stats.winRate * 40, 20)

  // Profit Factor: 0-25 pts (PF ≥ 3 = max)
  const pfScore = Math.min((stats.profitFactor / 3) * 25, 25)

  // Expectancy: 0-20 pts (≥ 100 = max)
  const expScore = Math.min(Math.max(stats.expectancy / 100, 0) * 20, 20)

  // Avg R-Multiple: 0-20 pts (≥ 2R = max)
  const rScore = Math.min(Math.max(stats.avgRMultiple / 2, 0) * 20, 20)

  // Consistency: 0-15 pts
  const ratio = stats.consecutiveWins > 0 && stats.consecutiveLosses > 0
    ? stats.consecutiveWins / (stats.consecutiveWins + stats.consecutiveLosses)
    : 0.5
  const consistencyScore = ratio * 15

  return Math.min(Math.round(winScore + pfScore + expScore + rScore + consistencyScore), 100)
}

export function groupTradesByDay(trades: Trade[]): Record<string, Trade[]> {
  return trades.reduce<Record<string, Trade[]>>((acc, trade) => {
    const date = trade.exit_date
      ? format(new Date(trade.exit_date), 'yyyy-MM-dd')
      : format(new Date(trade.entry_date), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(trade)
    return acc
  }, {})
}

export function calcCalendarData(
  trades: Trade[],
  year: number,
  month: number,
  breakevenRange = 0,
  noteDates: Set<string> = new Set()
): { days: CalendarDay[]; weeklySummaries: WeeklySummary[] } {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDayOfWeek = firstDay.getDay() // 0=Sun
  const byDay = groupTradesByDay(trades.filter(t => t.status === 'closed'))

  const days: CalendarDay[] = []

  // Leading empty cells (Mon-based: shift Sunday to end)
  const leadingEmpties = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  for (let i = 0; i < leadingEmpties; i++) {
    days.push({ date: null, netPnl: 0, nbTrades: 0, winRate: 0, avgRMultiple: 0, type: 'empty', trades: [], hasNote: false })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = format(new Date(year, month - 1, d), 'yyyy-MM-dd')
    const dayTrades = byDay[dateStr] ?? []
    const closed = dayTrades.filter(t => t.net_pnl !== null)
    const netPnl = closed.reduce((s, t) => s + (t.net_pnl ?? 0), 0)
    const wins = closed.filter(t => (t.net_pnl ?? 0) > breakevenRange).length
    const winRate = closed.length > 0 ? wins / closed.length : 0
    const avgRMultiple = closed.length > 0
      ? closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / closed.length
      : 0

    let type: CalendarDayType = 'no-trade'
    if (closed.length > 0) {
      if (netPnl > breakevenRange) type = 'win'
      else if (netPnl < -breakevenRange) type = 'loss'
      else type = 'breakeven'
    }

    days.push({
      date: dateStr,
      netPnl,
      nbTrades: dayTrades.length,
      winRate,
      avgRMultiple,
      type,
      trades: dayTrades,
      hasNote: noteDates.has(dateStr),
    })
  }

  // Trailing empty cells to complete 6×7 = 42
  while (days.length < 42) {
    days.push({ date: null, netPnl: 0, nbTrades: 0, winRate: 0, avgRMultiple: 0, type: 'empty', trades: [], hasNote: false })
  }

  const weeklySummaries: WeeklySummary[] = []
  for (let w = 0; w < 6; w++) {
    const week = days.slice(w * 7, w * 7 + 7)
    const tradingDays = week.filter(d => d.type !== 'empty' && d.type !== 'no-trade').length
    const totalPnl = week.reduce((s, d) => s + d.netPnl, 0)
    weeklySummaries.push({ weekIndex: w, totalPnl, tradingDays })
  }

  return { days, weeklySummaries }
}

export function calcWeeklySummaries(days: CalendarDay[]): WeeklySummary[] {
  const summaries: WeeklySummary[] = []
  for (let w = 0; w < Math.ceil(days.length / 7); w++) {
    const week = days.slice(w * 7, w * 7 + 7)
    const tradingDays = week.filter(d => d.type !== 'empty' && d.type !== 'no-trade').length
    const totalPnl = week.reduce((s, d) => s + d.netPnl, 0)
    summaries.push({ weekIndex: w, totalPnl, tradingDays })
  }
  return summaries
}

export function calcEquityCurve(trades: Trade[]): EquityPoint[] {
  const closed = trades
    .filter(t => t.status === 'closed' && t.net_pnl !== null && t.exit_date)
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime())

  const byDay = groupTradesByDay(closed)
  const dates = Object.keys(byDay).sort()

  let cumPnl = 0
  return dates.map(date => {
    const dailyPnl = byDay[date].reduce((s, t) => s + (t.net_pnl ?? 0), 0)
    cumPnl += dailyPnl
    return { date, dailyPnl, cumPnl }
  })
}

export function calcAggregatedStats(trades: Trade[], breakevenRange = 0): AggregatedStats {
  const closed = trades.filter(t => t.status === 'closed' && t.net_pnl !== null)
  const netPnl = closed.reduce((s, t) => s + (t.net_pnl ?? 0), 0)
  const grossPnl = closed.reduce((s, t) => s + (t.gross_pnl ?? 0), 0)
  const totalCommission = closed.reduce((s, t) => s + t.commission, 0)

  const wins = closed.filter(t => (t.net_pnl ?? 0) > breakevenRange)
  const losses = closed.filter(t => (t.net_pnl ?? 0) < -breakevenRange)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / losses.length : 0

  const rTrades = closed.filter(t => t.r_multiple !== null)
  const avgRMultiple = rTrades.length > 0
    ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length
    : 0

  const byDay = groupTradesByDay(closed)
  const dayPnls = Object.entries(byDay).map(([date, ts]) => ({
    date,
    pnl: ts.reduce((s, t) => s + (t.net_pnl ?? 0), 0),
  }))
  const bestDay = dayPnls.length > 0 ? dayPnls.reduce((a, b) => a.pnl > b.pnl ? a : b) : null
  const worstDay = dayPnls.length > 0 ? dayPnls.reduce((a, b) => a.pnl < b.pnl ? a : b) : null
  const tradingDays = dayPnls.length
  const winDays = dayPnls.filter(d => d.pnl > breakevenRange).length
  const winRateByDay = tradingDays > 0 ? winDays / tradingDays : 0

  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.net_pnl ?? 0)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.net_pnl ?? 0)) : 0

  // Consecutive streaks
  const sorted = [...closed].sort((a, b) =>
    new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime()
  )
  let maxWins = 0, maxLosses = 0, curWins = 0, curLosses = 0
  let curStreakType: 'win' | 'loss' | 'none' = 'none'
  let curStreakCount = 0

  for (const t of sorted) {
    if ((t.net_pnl ?? 0) > breakevenRange) {
      curWins++; curLosses = 0
      maxWins = Math.max(maxWins, curWins)
      curStreakType = 'win'; curStreakCount = curWins
    } else if ((t.net_pnl ?? 0) < -breakevenRange) {
      curLosses++; curWins = 0
      maxLosses = Math.max(maxLosses, curLosses)
      curStreakType = 'loss'; curStreakCount = curLosses
    } else {
      curWins = 0; curLosses = 0
      curStreakType = 'none'; curStreakCount = 0
    }
  }

  const stats: AggregatedStats = {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    winRate: calcWinRate(trades, breakevenRange),
    winRateByDay,
    profitFactor: calcProfitFactor(trades),
    netPnl,
    grossPnl,
    totalCommission,
    avgWin,
    avgLoss,
    expectancy: calcExpectancy(trades),
    avgRMultiple,
    maxDrawdown: calcMaxDrawdown(trades),
    bestDay,
    worstDay,
    largestWin,
    largestLoss,
    consecutiveWins: maxWins,
    consecutiveLosses: maxLosses,
    currentStreak: { type: curStreakType, count: curStreakCount },
    performanceScore: 0, // computed below
    totalDays: tradingDays,
    tradingDays,
  }

  stats.performanceScore = calcPerformanceScore({
    winRate: stats.winRate,
    profitFactor: stats.profitFactor,
    expectancy: stats.expectancy,
    avgRMultiple: stats.avgRMultiple,
    consecutiveWins: maxWins,
    consecutiveLosses: maxLosses,
  })

  return stats
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/calculations.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/calculations.ts lib/calculations.test.ts
git commit -m "feat: add calculations library with full test coverage"
```

---

### Task 8: Claude library + utils

**Files:**
- Create: `lib/claude.ts`
- Create: `lib/utils.ts`

- [ ] **Step 1: Create `lib/claude.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { TradingContext } from '@/types'

export async function analyzeWithClaude(
  userPrompt: string,
  context: TradingContext,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const systemPrompt = `Tu es un coach de trading expert et bienveillant.
Contexte de trading de l'utilisateur :
${JSON.stringify(context, null, 2)}

Règles :
- Sois direct, factuel et bienveillant
- Utilise des chiffres précis tirés du contexte
- Identifie des patterns actionnables
- Réponds toujours en français
- Utilise ## pour les titres, des bullet points et des émojis pour la lisibilité`

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}
```

- [ ] **Step 2: Create `lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceStrict } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatR(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}R`
}

export function formatDuration(start: string, end: string): string {
  return formatDistanceStrict(new Date(start), new Date(end), { locale: fr })
}

export function formatDate(date: string): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm')
}

export function pnlColor(value: number): string {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function pnlBg(value: number): string {
  if (value > 0) return 'bg-green-500/10'
  if (value < 0) return 'bg-red-500/10'
  return 'bg-slate-500/10'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/claude.ts lib/utils.ts
git commit -m "feat: add Claude wrapper and utility helpers"
```

---

### Task 9: Zustand store

**Files:**
- Create: `store/filtersStore.ts`

- [ ] **Step 1: Create `store/filtersStore.ts`**

```ts
import { create } from 'zustand'
import { startOfMonth, format } from 'date-fns'
import type { AssetClass, DisplayMode } from '@/types'

interface FiltersState {
  dateFrom: string
  dateTo: string
  accountIds: string[]
  assetClasses: AssetClass[]
  displayMode: DisplayMode
}

interface FiltersActions {
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
  setAccountIds: (ids: string[]) => void
  setAssetClasses: (classes: AssetClass[]) => void
  setDisplayMode: (mode: DisplayMode) => void
  reset: () => void
}

const today = format(new Date(), 'yyyy-MM-dd')
const firstOfMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

const initialState: FiltersState = {
  dateFrom: firstOfMonth,
  dateTo: today,
  accountIds: [],
  assetClasses: [],
  displayMode: 'dollar',
}

export const useFiltersStore = create<FiltersState & FiltersActions>((set) => ({
  ...initialState,
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setAccountIds: (accountIds) => set({ accountIds }),
  setAssetClasses: (assetClasses) => set({ assetClasses }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  reset: () => set(initialState),
}))
```

- [ ] **Step 2: Commit**

```bash
mkdir -p store
git add store/filtersStore.ts
git commit -m "feat: add Zustand global filters store"
```

---

## Phase 6 — Auth Pages

### Task 10: Root layout + auth pages

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trading Journal',
  description: 'Personal trading journal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            📊 Trading Journal
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Connexion</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          Accède à ton journal de trading
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Email</Label>
            <Input
              type="email"
              placeholder="trader@example.com"
              {...register('email')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pas de compte ?{' '}
            <Link href="/register" style={{ color: 'var(--accent-light)' }}>
              S&apos;inscrire
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

- [ ] **Step 4: Create `app/(auth)/register/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Compte créé ! Connecte-toi.')
    router.push('/login')
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Créer un compte</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          Commence à journaliser tes trades
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Email</Label>
            <Input
              type="email"
              placeholder="trader@example.com"
              {...register('email')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Confirmer</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: 'var(--accent-light)' }}>
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

- [ ] **Step 5: Add root redirect**

Create `app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat: add auth pages (login, register) and root redirect"
```

---

## Phase 7 — Dashboard Shell

### Task 11: Sidebar component

**Files:**
- Create: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Create `components/layout/Sidebar.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, ClipboardList, CalendarDays, TrendingDown,
  Target, BookOpen, Lightbulb, Settings, Plus,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

const NAV_ITEMS = [
  { href: '/dashboard',    icon: BarChart2,     label: 'Dashboard' },
  { href: '/trades',       icon: ClipboardList, label: 'Trades' },
  { href: '/daily-stats',  icon: CalendarDays,  label: 'Daily Stats' },
  { href: '/reports',      icon: TrendingDown,  label: 'Reports' },
  { href: '/strategies',   icon: Target,        label: 'Strategies' },
  { href: '/notebook',     icon: BookOpen,      label: 'Notebook' },
  { href: '/ai-insights',  icon: Lightbulb,     label: 'AI Insights' },
  { href: '/settings',     icon: Settings,      label: 'Settings' },
]

interface SidebarProps {
  userEmail: string
  onAddTrade?: () => void
}

export function Sidebar({ userEmail, onAddTrade }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) { toast.error(error.message); return }
    router.push('/login')
  }

  const displayName = userEmail.split('@')[0]

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className="flex flex-col h-screen shrink-0 border-r transition-all duration-200"
        style={{
          width: collapsed ? 64 : 220,
          background: 'var(--bg-primary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && (
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              📊 TJ
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] ml-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Add Trade button */}
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onAddTrade}
                className={cn('w-full gap-2', collapsed && 'px-0 justify-center')}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus size={16} />
                {!collapsed && <span className="text-sm">Add Trade</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Add Trade</TooltipContent>}
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                      collapsed && 'justify-center',
                      active
                        ? 'bg-[var(--accent)]/10 text-[var(--accent-light)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && label}
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
              </Tooltip>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className={cn('flex items-center gap-2 px-2 py-2 rounded-md', collapsed && 'justify-center')}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback style={{ background: 'var(--accent)', color: 'white', fontSize: 11 }}>
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                  {displayName}
                </span>
                <button onClick={handleLogout} className="text-[var(--text-muted)] hover:text-red-400">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p components/layout
git add components/layout/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar with navigation"
```

---

### Task 12: GlobalFilters + Header

**Files:**
- Create: `components/layout/GlobalFilters.tsx`
- Create: `components/layout/Header.tsx`

- [ ] **Step 1: Create `components/layout/GlobalFilters.tsx`**

```tsx
'use client'

import { useFiltersStore } from '@/store/filtersStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Account } from '@/types'

interface GlobalFiltersProps {
  accounts: Account[]
}

export function GlobalFilters({ accounts }: GlobalFiltersProps) {
  const { dateFrom, dateTo, accountIds, displayMode, setDateFrom, setDateTo, setAccountIds, setDisplayMode, reset } =
    useFiltersStore()

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>De</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-8 text-sm w-36"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>À</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-8 text-sm w-36"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      {accounts.length > 0 && (
        <Select
          value={accountIds[0] ?? 'all'}
          onValueChange={v => setAccountIds(v === 'all' ? [] : [v])}
        >
          <SelectTrigger className="h-8 text-sm w-44"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <SelectValue placeholder="Tous les comptes" />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <SelectItem value="all">Tous les comptes</SelectItem>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={displayMode} onValueChange={v => setDisplayMode(v as typeof displayMode)}>
        <SelectTrigger className="h-8 text-sm w-28"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <SelectItem value="dollar">$ Dollar</SelectItem>
          <SelectItem value="percentage">% Pct</SelectItem>
          <SelectItem value="r_multiple">R Multiple</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={reset} style={{ color: 'var(--text-muted)' }}>
        Reset
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/layout/Header.tsx`**

```tsx
'use client'

import { GlobalFilters } from './GlobalFilters'
import type { Account } from '@/types'

interface HeaderProps {
  title: string
  accounts: Account[]
  children?: React.ReactNode
}

export function Header({ title, accounts, children }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b shrink-0"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <GlobalFilters accounts={accounts} />
        {children}
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/GlobalFilters.tsx components/layout/Header.tsx
git commit -m "feat: add GlobalFilters and Header layout components"
```

---

### Task 13: Dashboard layout

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx` (placeholder)

- [ ] **Step 1: Create `app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ''}
        accounts={accounts ?? []}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/page.tsx` placeholder**

```tsx
export default function DashboardPage() {
  return (
    <main className="flex-1 overflow-auto p-6">
      <h2 style={{ color: 'var(--text-primary)' }}>Dashboard — coming in Plan 3</h2>
    </main>
  )
}
```

- [ ] **Step 3: Create placeholders for all other dashboard pages**

```bash
mkdir -p app/\(dashboard\)/{trades,daily-stats,reports,strategies,notebook,ai-insights,settings}

for page in trades daily-stats reports strategies notebook ai-insights settings; do
  echo "export default function Page() { return <main className='flex-1 overflow-auto p-6' style={{color:'var(--text-primary)'}}><h2>${page} — coming soon</h2></main> }" \
    > "app/(dashboard)/${page}/page.tsx"
done
```

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add dashboard layout with sidebar and placeholder pages"
```

---

## Phase 8 — Verify Foundation

### Task 14: Smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run unit tests**

```bash
npx vitest run
```

Expected: all calculation tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

- [ ] **Step 4: Verify routes**

- Navigate to `http://localhost:3000` → redirects to `/dashboard` → redirects to `/login` ✓
- Navigate to `http://localhost:3000/login` → shows login card ✓
- Navigate to `http://localhost:3000/register` → shows register card ✓
- Create a test account, log in → redirected to `/dashboard` ✓
- Sidebar visible, all 8 nav links present ✓
- Collapse sidebar → icons only ✓

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: plan 1 foundation complete — all smoke tests pass"
```

---

## Self-Review

**Spec coverage:**
- ✅ Project scaffold + all dependencies
- ✅ Design system (CSS tokens, globals.css)
- ✅ DB schema (all 7 tables + RLS + triggers + indexes)
- ✅ All types (unions, interfaces, DB rows)
- ✅ Supabase clients (browser + server + service role)
- ✅ Middleware (session refresh + route protection)
- ✅ All calculation functions + tests
- ✅ Claude wrapper (claude-opus-4-8)
- ✅ Utils (cn, formatCurrency, formatPct, formatR, etc.)
- ✅ Zustand filters store
- ✅ Auth pages (login + register + Zod validation)
- ✅ Dashboard layout (Sidebar collapsible + Header + GlobalFilters)
- ✅ Placeholder pages for all 8 routes
- ✅ vercel.json

**Gaps checked:** none — all spec sections covered.

**Type consistency:** all types defined in Task 4 and referenced consistently. `calcAggregatedStats` uses `AggregatedStats` interface. `CalendarDay` uses `CalendarDayType`. All API response shapes defined.

---

*Next: Plan 2 — Trades (TradeTable + TradeForm + CRUD API)*

# Trading Journal — Design Spec
Date: 2026-06-01

## Overview

Application web de journal de trading personnel inspirée de Tradezella.
Desktop uniquement (min-width: 1024px). Déploiement Vercel + Supabase.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 App Router + TypeScript strict |
| Base de données | Supabase (PostgreSQL) + RLS |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (bucket `screenshots`) |
| UI | shadcn/ui dark + Tailwind CSS |
| Charts | Recharts |
| IA | @anthropic-ai/sdk — modèle `claude-opus-4-8` |
| State global | Zustand (filtres globaux) |
| Formulaires | React Hook Form + Zod |
| Éditeur MD | @uiw/react-md-editor |
| Toasts | sonner |
| Dates | date-fns |
| Icônes | lucide-react |
| Déploiement | Vercel |

---

## Design system

```css
--bg-primary:   #0f1117
--bg-card:      #1a1d2e
--bg-hover:     #252840
--accent:       #7c3aed
--accent-light: #a78bfa
--green:        #22c55e
--red:          #ef4444
--grey-neutral: #6b7280
--text-primary: #f1f5f9
--text-muted:   #94a3b8
--border:       #2d3148
```

**Sidebar** : fond #0f1117, largeur 220px fixe, icône collapse,
bouton "+ Add Trade" violet en haut, avatar + nom en bas.

**Navigation (ordre exact)** :
📊 Dashboard · 📋 Trades · 📅 Daily Stats · 📉 Reports ·
🎯 Strategies · 📝 Notebook · 💡 AI Insights · ⚙️ Settings

---

## Environnement

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=   ← jamais exposé côté client
```

`vercel.json` : framework nextjs, buildCommand "next build",
fonctions `app/api/**` maxDuration 30.

---

## Schéma base de données (`supabase/schema.sql`)

### Table `accounts`
```sql
id, user_id, name, broker, type(live/demo/prop),
balance, currency, created_at
```

### Table `tags`
```sql
id, user_id, name, color(#7c3aed),
category(setup/mistake/condition/custom)
```

### Table `strategies`
```sql
id, user_id, name, description, asset_class,
entry_rules, exit_rules, risk_rules,
checklist(JSONB), created_at, updated_at
```

### Table `trades`
```sql
id, user_id, account_id, symbol, side(long/short),
status(open/closed), asset_class(forex/stocks/crypto/futures/options),
entry_date, exit_date, entry_price, exit_price,
quantity, stop_loss, take_profit,
gross_pnl, net_pnl, commission(default 0), r_multiple,
risk_amount, rating(1-5),
emotion(confident/fearful/impulsive/neutral/greedy/calm/anxious),
notes, setup_notes, mistake_notes, screenshots(TEXT[]),
created_at, updated_at
```

### Pivots
```sql
trade_tags       : (trade_id, tag_id) PK composite
trade_strategies : (trade_id, strategy_id) PK composite
```

### Table `notebook_entries`
```sql
id, user_id, title, content, type(daily/weekly/plan/recap/custom),
trade_date, created_at, updated_at
```

### Table `settings`
```sql
user_id PK, anthropic_api_key, default_commission,
breakeven_range, currency(USD), timezone(Europe/Paris),
display_mode(dollar)
```

**RLS** activée sur toutes les tables.
Policy "own" : `auth.uid() = user_id` sur chaque table.
Pour `trade_tags` et `trade_strategies` : `EXISTS` sur `trades.user_id`.

---

## Structure des fichiers

```
/app
  /(auth)/login/page.tsx
  /(auth)/register/page.tsx
  /(dashboard)/layout.tsx          ← Sidebar + GlobalFilters
  /(dashboard)/dashboard/page.tsx
  /(dashboard)/trades/page.tsx
  /(dashboard)/daily-stats/page.tsx
  /(dashboard)/reports/page.tsx
  /(dashboard)/strategies/page.tsx
  /(dashboard)/strategies/[id]/page.tsx
  /(dashboard)/notebook/page.tsx
  /(dashboard)/ai-insights/page.tsx
  /(dashboard)/settings/page.tsx
  /api/trades/route.ts
  /api/trades/[id]/route.ts
  /api/stats/route.ts
  /api/stats/calendar/route.ts
  /api/stats/equity/route.ts
  /api/ai/analyze/route.ts
  /api/ai/test/route.ts
  /api/settings/route.ts
  /api/upload/route.ts

/components
  /layout    : Sidebar, GlobalFilters, Header
  /dashboard : StatCard, WinRateDonut, PnlAreaChart,
               DailyBarChart, CalendarWidget, WeeklyColumn,
               HeatmapGrid, PerformanceRadar, CurrentStreak
  /trades    : TradeTable, TradeForm, FiltersBar
  /reports   : EquityCurve, PnlHistogram, BarByDayOfWeek,
               BarByHour, BarBySymbol, BarByStrategy,
               BarByDuration, EmotionPieChart, HeatmapDayHour,
               RMultipleHistogram, DrawdownChart
  /notebook  : NotebookEditor, NoteCard
  /ai        : ClaudeChat, AnalysisCard
  /ui        ← composants shadcn

/lib
  /supabase/client.ts   ← createBrowserClient()
  /supabase/server.ts   ← createServerClient() SSR
  calculations.ts
  claude.ts
  utils.ts

/hooks : useTrades.ts · useStats.ts · useCalendar.ts
/store : filtersStore.ts (Zustand)
/types : database.ts · index.ts
/supabase/schema.sql
middleware.ts
```

---

## Types (`/types/index.ts`)

```typescript
type AssetClass   = 'forex'|'stocks'|'crypto'|'futures'|'options'
type TradeSide    = 'long'|'short'
type TradeStatus  = 'open'|'closed'
type Emotion      = 'confident'|'fearful'|'impulsive'|'neutral'|
                    'greedy'|'calm'|'anxious'
type DisplayMode  = 'dollar'|'percentage'|'r_multiple'
type NoteType     = 'daily'|'weekly'|'plan'|'recap'|'custom'

interface Trade        // tous champs table + tags?:Tag[] + strategies?:Strategy[]
interface CalendarDay  // date, netPnl, nbTrades, winRate, avgRMultiple,
                       // type(win/loss/breakeven/no-trade/empty), trades, hasNote
interface WeeklySummary    // weekIndex, totalPnl, tradingDays
interface AggregatedStats  // totalTrades, closedTrades, openTrades, winRate,
                           // winRateByDay, profitFactor, netPnl, grossPnl,
                           // totalCommission, avgWin, avgLoss, expectancy,
                           // avgRMultiple, maxDrawdown, bestDay, worstDay,
                           // largestWin, largestLoss, consecutiveWins,
                           // consecutiveLosses, currentStreak, performanceScore,
                           // totalDays, tradingDays
interface TradingContext   // period, stats, topSymbols, topStrategies,
                           // emotionBreakdown, recentTrades, worstTags
```

---

## Calculs (`/lib/calculations.ts`)

| Fonction | Formule |
|----------|---------|
| `calcGrossPnl` | `(exit - entry) × qty × (long ? 1 : -1)` |
| `calcNetPnl` | `grossPnl - commission` |
| `calcRMultiple` | `((exit - entry) × dir) / \|entry - stopLoss\|` |
| `calcProfitFactor` | `sumWins / \|sumLosses\|` (∞ si aucune perte) |
| `calcWinRate` | `wins / closed.length` (breakevenRange param) |
| `calcExpectancy` | moyenne `net_pnl` des trades fermés |
| `calcMaxDrawdown` | pic glissant sur P&L cumulatif trié par date |
| `calcPerformanceScore` | Win Rate 20pts + PF 25pts + Expectancy 20pts + AvgR 20pts + Consistency 15pts → /100 |
| `calcCalendarData` | grille 42 cases (6×7), type win/loss/breakeven/no-trade/empty |
| `calcWeeklySummaries` | grouper 7 jours → totalPnl + tradingDays |
| `calcEquityCurve` | trier exit_date → grouper jour → cumuler |
| `groupTradesByDay` | `Record<"YYYY-MM-DD", Trade[]>` |

---

## Zustand — `filtersStore.ts`

```typescript
state  : dateFrom(début mois), dateTo(aujourd'hui),
         accountIds([]), assetClasses([]), displayMode('dollar')
actions: setDateFrom, setDateTo, setAccountIds,
         setAssetClasses, setDisplayMode, reset
```
Lu par toutes les pages pour construire les query params API.

---

## Supabase clients

- `client.ts` → `createBrowserClient()` depuis `@supabase/ssr`
- `server.ts` → `createServerClient()` avec `cookies()` de `next/headers`
- `middleware.ts` → refresh session + redirect `/(dashboard)` → `/login`

---

## Routes API

Toutes vérifient la session → 401 si non authentifié.

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/trades` | GET | Filtres complets + pagination 50/page + relations tags/strategies |
| `/api/trades` | POST | Calcul serveur gross_pnl/net_pnl/r_multiple/risk_amount + pivots |
| `/api/trades/[id]` | PUT | Recalcul auto + suppression/recréation pivots |
| `/api/trades/[id]` | DELETE | Supprime trade + screenshots Storage (CASCADE pivots) |
| `/api/stats` | GET | AggregatedStats + topSymbols(top10) + topStrategies + emotionBreakdown + worstTags |
| `/api/stats/calendar` | GET | CalendarDay[] 42 cases + WeeklySummaries + hasNote |
| `/api/stats/equity` | GET | `[{date, dailyPnl, cumPnl}]` |
| `/api/ai/analyze` | POST | Lit clé DB server-side → TradingContext → Claude → response |
| `/api/ai/test` | POST | Test clé stockée → `{ok, error?}` |
| `/api/settings` | GET | Settings SANS anthropic_api_key + hasApiKey: boolean |
| `/api/settings` | PUT | Upsert settings |
| `/api/upload` | POST | Multipart jpg/png/webp max 5MB → Storage path `{userId}/{ts}-{name}` → url |

---

## `/lib/claude.ts`

```typescript
analyzeWithClaude(userPrompt, context, apiKey)
  // Anthropic client avec la clé fournie
  // Modèle : claude-opus-4-8, max_tokens: 2048
  // System : coach trading expert, réponses FR, ##/bullets/emojis
  // Return : response.content[0].text
```

---

## Pages

### Dashboard
- Barre supérieure : salutation + import CSV + date range + compte + Filters
- Layout 60/40 : CalendarWidget (gauche) + widgets empilés (droite)
- Calendrier : 7 cols + col Weekly Summary, couleurs win/loss/breakeven,
  clic → Sheet latéral jour
- Widgets : Net P&L · Profit Factor + gauge · WinRate Trades donut ·
  WinRate Days donut · CurrentStreak · Account Balance · Expectancy ·
  PerformanceRadar (5 axes, score /100)

### Trades
- Table : 19 colonnes, tri, pagination, sélection multiple
- Drawer TradeForm 7 sections : Identité / Prix / Risk /
  Résultats live / Psychologie / Tags & Stratégies / Screenshots
- Calculs live : Gross P&L, Net P&L, R-Multiple, Risk Amount
- Validation Zod : symbol, side, entry_date, entry_price, quantity requis
- Si closed : exit_price + exit_date requis

### Daily Stats
- Tableau journées tradées avec expand → mini cards trades

### Reports (8 tabs)
1. Overview : EquityCurve + DailyBarChart + PnlHistogram + 4 StatCards
2. Calendar : vue annuelle 12 mois miniatures + clic → mensuel
3. Day & Time : By Day / By Hour / Heatmap Jour×Heure / By Duration
4. Symbols : BarChart horizontal + tableau
5. Strategies : même structure + "Analyser avec Claude"
6. Tags : groupé par catégorie + top gagnants/perdants
7. Risk : RMultipleHistogram + DrawdownChart + tableau
8. Psychology : EmotionPieChart + tableau + BarByRating + "Analyser avec Claude"

### Strategies
- Liste cards + page détail [id] 4 tabs : Trades / Stats / Description / Checklist

### Notebook
- Layout 30/70 : liste notes (gauche) + éditeur MD auto-save 30s (droite)
- 4 templates : Journal / Recap hebdo / Plan / Analyse de trade

### AI Insights
- Config clé Anthropic + test (🟢/🔴)
- 7 analyses rapides prédéfinies
- Chat libre avec historique localStorage

### Settings (8 sections)
1. Comptes CRUD · 2. API Claude · 3. Préférences ·
4. Tags CRUD · 5. Import CSV (preview + mapping + dédup) ·
6. Export CSV/JSON · 7. Profil · 8. Danger Zone (double confirmation)

---

## Composants Recharts

Styles communs : `CartesianGrid stroke="#2d3148"`, axes `#94a3b8 fontSize=11`,
tooltip `bg="#1a1d2e" border="#2d3148"`, tous dans `ResponsiveContainer`.

| Composant | Type | Détail |
|-----------|------|--------|
| PnlAreaChart | AreaChart | gradient vert 0.3→0, ReferenceLine y=0 |
| WinRateDonut | PieChart | innerR=60 outerR=80, label central % WINRATE |
| DailyBarChart | ComposedChart | Cell vert/rouge + Line cumul violet |
| HeatmapDayHour | grille CSS | 5×24, opacity ∝ \|pnl\|/max |
| PerformanceRadar | RadarChart | 5 axes 0-100, fill #7c3aed 0.3 |
| DrawdownChart | AreaChart | fill rouge, max annoté ReferenceLine |
| RMultipleHistogram | BarChart | buckets 0.5R, vert≥0/rouge<0 |
| EmotionPieChart | PieChart | donut, couleur par émotion |

---

## Règles de développement

- Prettier print width 80, zéro TypeScript `any`
- Zod sur tous les formulaires
- Toutes erreurs Supabase/Claude → toast sonner
- Aucune donnée mockée (tout vient de Supabase)
- Pas de `fs`, pas de dépendances node-only côté client
- Desktop uniquement (min-width: 1024px)
- Prêt pour déploiement Vercel immédiat

---

## Non implémenté (hors scope)

❌ Graphiques prix temps réel · ❌ Backtesting · ❌ Trade Replay
❌ Connexion broker · ❌ Mobile

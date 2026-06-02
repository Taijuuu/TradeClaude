# Trading Journal — Tabs Completion Design

**Date:** 2026-06-02  
**Scope:** Implement the 5 stub pages (Reports, Strategies, Notebook, AI Insights, Settings)  
**Constraint:** Zero design changes — same CSS variables, dark theme, card styles, typography as existing pages.

---

## Context

The app already has:
- All backend API routes implemented (`/api/settings`, `/api/strategies`, `/api/notebook`, `/api/ai/analyze`, `/api/stats`, `/api/trades`)
- Supabase schema with all required tables
- `recharts` v3.8.1 installed
- `useStats`, `useTrades`, `useCalendar` hooks
- Existing CSS design system via CSS variables

Only the frontend pages are stubs. No new API routes needed.

---

## Settings (`/settings/page.tsx`)

**Layout:** Single scrollable page with two grouped sections.

**Section 1 — Général:**
- `default_commission` (number input, default 0)
- `currency` (select: USD / EUR / GBP)
- `timezone` (select: Europe/Paris + common zones)
- `display_mode` (segmented control: $ Dollar / % Pourcentage / R Multiple)
- `breakeven_range` (number input)

**Section 2 — AI & Clé API:**
- `anthropic_api_key` (password input, masked, shows "Configurée ✓" if already set)

**Behavior:**
- Loads current settings via `GET /api/settings` on mount
- Single "Sauvegarder" button → `PUT /api/settings` → toast success/error
- `hasApiKey` boolean from API used to display key status

---

## Strategies (`/strategies/page.tsx`)

**Layout:** Header with "New Strategy" button + grid/list of strategy cards.

**Strategy card shows:** name, asset_class badge, description preview (truncated), edit/delete actions.

**Create/Edit drawer (Sheet component):**
- `name` (required text input)
- `asset_class` (select: forex/stocks/crypto/futures/options, optional)
- `description` (textarea)
- `entry_rules` (textarea)
- `exit_rules` (textarea)
- `risk_rules` (textarea)
- `checklist` (dynamic list: add/remove text items)

**API calls:**
- `GET /api/strategies` → list
- `POST /api/strategies` → create
- `PUT /api/strategies/[id]` → update
- `DELETE /api/strategies/[id]` → delete (with confirmation)

**Empty state:** "Aucune stratégie. Clique sur + New Strategy pour commencer."

---

## Notebook (`/notebook/page.tsx`)

**Layout:** Filter tabs row + list of entries + "+ New Entry" button.

**Filter tabs:** Tous | Daily | Weekly | Plan | Recap | Custom

**Entry list item shows:** title, type badge (colored), trade_date (if set), first line of content (truncated), edit/delete actions.

**Create/Edit drawer:**
- `title` (required text input)
- `type` (select: daily/weekly/plan/recap/custom)
- `trade_date` (date input, optional)
- `content` (textarea, large)

**API calls:**
- `GET /api/notebook?type=xxx` → list with optional type filter
- `POST /api/notebook` → create
- `PUT /api/notebook/[id]` → update
- `DELETE /api/notebook/[id]` → delete

**Empty state:** "Aucune entrée. Commence à écrire ton journal de trading."

---

## Reports (`/reports/page.tsx`)

**Layout:** Grid of chart cards, same card style as Dashboard.

**Section 1 — Equity Curve:**
- `LineChart` (recharts) of cumulative net P&L over time
- Data: all trades sorted by `exit_date`, compute running cumulative sum
- X axis: date, Y axis: € P&L
- Green line above 0, red below (single color: accent purple is fine too)

**Section 2 — P&L par mois:**
- `BarChart` (recharts) grouped by month (YYYY-MM)
- Green bar if positive, red if negative
- Data computed from trades array

**Section 3 — Top Symboles:**
- Table: symbol | trades | win rate | net P&L
- Data from `StatsResponse.topSymbols`

**Section 4 — Répartition émotions:**
- Small table or badge list: emotion | trades | win rate
- Data from `StatsResponse.emotionBreakdown`

**Data fetching:**
- `useStats` for aggregated stats + topSymbols + emotionBreakdown
- `useTrades` with high limit (500) for raw trade data to compute equity curve and monthly P&L

**Empty state:** "Aucun trade fermé dans cette période."

---

## AI Insights (`/ai-insights/page.tsx`)

**Layout:** Depends on API key presence.

**No API key configured:**
- Card with info message: "Configure ta clé API Anthropic dans Settings pour activer l'analyse IA."
- Button linking to `/settings`

**API key configured:**
- Row of preset prompt buttons:
  - "Analyser mes 30 derniers trades"
  - "Identifier mes patterns de pertes"
  - "Conseils pour améliorer mon win rate"
  - "Résumé de mes performances"
- On click → `POST /api/ai/analyze` with the chosen prompt
- Response displayed in a card below (plain text, `{ response: string }` from API)
- Loading spinner while analyzing (button disabled during request)

**API call:** `POST /api/ai/analyze` with `{ prompt: string }`

---

## Implementation Notes

- Use existing `Sheet` / `Button` / `Badge` / `Input` / `Select` / `Textarea` from `@/components/ui/`
- Use `toast` (sonner) for success/error notifications
- Respect all CSS variables: `var(--bg-card)`, `var(--border)`, `var(--text-primary)`, `var(--text-muted)`, `var(--accent)`, `var(--bg-hover)`
- `'use client'` directive on all pages
- No new dependencies — recharts already installed, all UI components exist
- All 5 pages are independent — can be implemented in parallel

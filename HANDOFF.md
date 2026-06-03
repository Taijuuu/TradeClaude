# TradeClaude — Handoff Document
**Date :** 2026-06-03  
**Repo :** https://github.com/Taijuuu/TradeClaude  
**Production :** https://tradeclaude.vercel.app  
**Supabase projet :** mdrizbczzbnrlxnqerbf (https://mdrizbczzbnrlxnqerbf.supabase.co)

---

## Stack technique
- **Frontend :** Next.js 16 (App Router, Turbopack), Tailwind CSS, shadcn/ui, Recharts
- **Backend :** Next.js API Routes (serverless Vercel)
- **DB :** Supabase (PostgreSQL + RLS)
- **Auth :** Supabase Auth
- **Déploiement :** Vercel (projet : `tradeclaude`)

---

## Ce qui est fait ✅

### Auth
- Login / Register / Forgot password / Reset password
- Thème dark/light (toggle soleil/lune en bas à gauche de la sidebar)

### Dashboard (inspiré de TradeZella)
- 5 KPI cards : Net P&L, Expectancy, Profit Factor, Win%, Avg Win/Loss
- Progress Heatmap 52 semaines (style GitHub, vert/rouge selon P&L)
- Courbe cumulative P&L (area chart)
- Daily P&L bars (barres vertes/rouges par jour)
- Account Balance (courbe du solde = solde initial + P&L cumulé)
- Calendrier mensuel pleine largeur avec stats mensuelles + résumés hebdo
- Drawdown chart (area rouge descendante)
- Trade Time Performance (scatter : heure d'entrée vs P&L)
- Trade Duration Performance (scatter : durée vs P&L)
- Tableau des trades récents

### Pages
- **Trades** : liste complète, formulaire ajout/édition, filtres
- **Daily Stats** : stats par jour
- **Reports** : equity curve, P&L mensuel, top symboles, émotions
- **Strategies** : CRUD stratégies avec checklist
- **Notebook** : journal de trading (notes daily/weekly/plan/recap/custom)
- **AI Insights** : analyse Claude via clé API Anthropic
- **Settings** : commission, breakeven, devise, timezone, mode affichage, clé Anthropic

### Intégration MetaTrader MT5
- Bouton **"Add Account"** en haut à droite (remplace Reset)
- **Onglet "Expert Advisor (gratuit)"** : génère du code MQL5 pré-rempli avec la clé user, à copier dans MT5 Desktop → installe l'EA → chaque trade fermé est envoyé automatiquement via webhook
- **Onglet "MetaAPI"** : connexion via login+investor password+serveur (payant, ~2€/mois sur metaapi.cloud)
- Route webhook : `POST /api/mt5/webhook?key=USER_ID`
- Routes MetaAPI : `/api/mt5/connect`, `/api/mt5/status`, `/api/mt5/import`, `/api/mt5/disconnect`

---

## Ce qui reste à faire ❌

### Priorité haute
1. **EA — sync au démarrage MT5** : quand MT5 était éteint et des trades se sont fermés, l'EA doit les détecter au redémarrage via `OnInit()` en scannant l'historique récent et en envoyant les trades manqués au webhook
2. **Import CSV** : permettre à l'utilisateur d'exporter l'historique MT5 (rapport HTML/CSV) et de l'uploader dans TradeClaude pour import en masse (utile pour les traders mobiles)
3. **Day View** : page `/daily-stats` à améliorer pour ressembler à TradeZella Day View — grouper les trades par jour, mini-graphique par jour, stats : Total Trades, Gross P&L, Winners/Losers, Commissions, Win Rate, Volume, Profit Factor

### Priorité moyenne
4. **Trade View amélioré** : ajouter colonnes Entry Price, Exit Price, Net ROI dans la table `/trades`
5. **Sync automatique dashboard** : au chargement du dashboard, déclencher un re-sync léger pour les comptes MT5 connectés (appel `/api/mt5/import` en background)
6. **Supabase Auth redirect URL** : configurer `https://tradeclaude.vercel.app/reset-password` dans Supabase → Authentication → URL Configuration → Redirect URLs (à faire côté dashboard Supabase, pas dans le code)

### Priorité basse
7. **Screenshots sur les trades** : upload d'images (captures MT5) liées à un trade, stockées dans Supabase Storage
8. **Tags** sur les trades : système de tags (setup, mistake, condition) avec filtres
9. **Import MetaAPI historique** : si l'utilisateur paie MetaAPI, déclencher un re-sync automatique à intervalles réguliers (Vercel cron)
10. **Export PDF** des reports (comme TradeZella)

---

## Variables d'environnement Vercel (projet `tradeclaude`)
```
NEXT_PUBLIC_SUPABASE_URL        = https://mdrizbczzbnrlxnqerbf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhbG... (anon key Supabase)
SUPABASE_SERVICE_ROLE_KEY       = eyJhbG... (service role Supabase)
NEXT_PUBLIC_APP_URL             = https://tradeclaude.vercel.app
METAAPI_TOKEN                   = eyJhbG... (token MetaAPI)
```

---

## Architecture fichiers clés
```
app/
  (auth)/login|register|forgot-password|reset-password
  (dashboard)/dashboard|trades|daily-stats|reports|strategies|notebook|ai-insights|settings
  api/
    accounts/         → CRUD comptes
    trades/           → CRUD trades
    stats/            → equity, calendar, heatmap, scatter
    notebook/         → CRUD notes
    strategies/       → CRUD stratégies
    settings/         → paramètres user
    ai/analyze        → Claude AI analysis
    mt5/              → connect, status, import, disconnect, webhook, webhook-key

components/
  dashboard/          → tous les widgets graphiques
  layout/             → Sidebar, DashboardHeader, GlobalFilters, AccountsProvider
  mt5/                → AddAccountSheet (EA + MetaAPI tabs)
  ui/                 → shadcn components
  ThemeToggle.tsx

lib/
  metaapi.ts          → helpers REST MetaAPI
  calculations.ts     → calculs stats/equity/calendar
  supabase/           → client/server Supabase helpers

hooks/
  useStats.ts | useTrades.ts | useEquity.ts | useScatter.ts | useCalendar.ts

store/
  filtersStore.ts     → filtres globaux (date, account, displayMode)
```

---

## Notes importantes
- Les tables Supabase n'avaient pas été créées sur le bon projet. Le schéma complet est dans `supabase/schema.sql` et a été appliqué manuellement sur le projet `mdrizbczzbnrlxnqerbf`
- Les colonnes `mt5_ticket`, `metaapi_account_id`, `mt5_login` ont été ajoutées au schéma de base (elles sont dans schema.sql)
- Le type Supabase (`types/database.ts`) n'est pas regénéré — certaines tables utilisent `(supabase as any)` en workaround TypeScript
- Le thème est géré via classes CSS `.dark` / `.light` sur `<html>`, persisté dans `localStorage`

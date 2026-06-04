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
export type DisplayMode = 'dollar' | 'euro'
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

export interface Strategy extends Omit<StrategyRow, 'checklist'> {
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

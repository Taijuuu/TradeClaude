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

  // Consistency: 0-15 pts — no losses = perfect, no wins = zero
  const ratio = stats.consecutiveLosses === 0
    ? 1
    : stats.consecutiveWins === 0
    ? 0
    : stats.consecutiveWins / (stats.consecutiveWins + stats.consecutiveLosses)
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

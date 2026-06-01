'use client'
import { useMemo } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useTrades } from '@/hooks/useTrades'
import { groupTradesByDay, calcWinRate } from '@/lib/calculations'
import { formatCurrency, cn } from '@/lib/utils'

export default function DailyStatsPage() {
  const { dateFrom, dateTo, accountIds } = useFiltersStore()
  const accountId = accountIds[0]

  const { trades, loading } = useTrades({ dateFrom, dateTo, accountId, status: 'closed' }, 500)

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

        const rTrades = closed.filter(t => t.r_multiple != null)
        const avgR = rTrades.length > 0
          ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length
          : 0

        const bestTrade = closed.length > 0
          ? closed.reduce((a, b) => (a.net_pnl ?? 0) > (b.net_pnl ?? 0) ? a : b)
          : null
        const worstTrade = closed.length > 0
          ? closed.reduce((a, b) => (a.net_pnl ?? 0) < (b.net_pnl ?? 0) ? a : b)
          : null

        const longs = dayTrades.filter(t => t.side === 'long').length
        const shorts = dayTrades.filter(t => t.side === 'short').length

        return { date, trades: dayTrades, closedTrades: closed, netPnl, grossPnl, commission, winRate, avgR, bestTrade, worstTrade, longs, shorts }
      })
  }, [trades])

  const th = 'text-left px-3 py-2 text-xs font-medium whitespace-nowrap'
  const td = 'px-3 py-2 text-xs whitespace-nowrap'

  return (
    <main className="flex-1 overflow-auto p-4">
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</span>
          </div>
        ) : (
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Date', 'Trades', '↑ Long', '↓ Short', 'Gross P&L', 'Net P&L', 'Commission', 'Win Rate', 'Meilleur', 'Pire', 'Avg R'].map(h => (
                  <th key={h} className={th} style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Aucun trade sur cette période
                  </td>
                </tr>
              )}
              {days.map(day => (
                <tr
                  key={day.date}
                  className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className={cn(td, 'font-medium')} style={{ color: 'var(--text-primary)' }}>
                    {day.date}
                  </td>
                  <td className={td} style={{ color: 'var(--text-muted)' }}>{day.trades.length}</td>
                  <td className={td} style={{ color: '#22c55e' }}>{day.longs}</td>
                  <td className={td} style={{ color: '#ef4444' }}>{day.shorts}</td>
                  <td className={td} style={{
                    color: day.grossPnl >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 500,
                  }}>
                    {formatCurrency(day.grossPnl)}
                  </td>
                  <td className={td} style={{
                    color: day.netPnl >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 700,
                  }}>
                    {formatCurrency(day.netPnl)}
                  </td>
                  <td className={td} style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(day.commission)}
                  </td>
                  <td className={td} style={{ color: 'var(--text-muted)' }}>
                    {Math.round(day.winRate * 100)}%
                  </td>
                  <td className={td} style={{ color: '#22c55e' }}>
                    {day.bestTrade ? formatCurrency(day.bestTrade.net_pnl!) : '—'}
                  </td>
                  <td className={td} style={{ color: '#ef4444' }}>
                    {day.worstTrade ? formatCurrency(day.worstTrade.net_pnl!) : '—'}
                  </td>
                  <td className={td} style={{
                    color: day.avgR >= 0 ? '#22c55e' : '#ef4444',
                  }}>
                    {day.avgR !== 0 ? `${day.avgR >= 0 ? '+' : ''}${day.avgR.toFixed(2)}R` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

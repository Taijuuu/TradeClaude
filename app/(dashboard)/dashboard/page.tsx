'use client'
import { useFiltersStore } from '@/store/filtersStore'
import { useStats } from '@/hooks/useStats'
import { useTrades } from '@/hooks/useTrades'
import { useEquity } from '@/hooks/useEquity'
import { useAccounts } from '@/components/layout/AccountsProvider'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { PnlAreaChart } from '@/components/dashboard/PnlAreaChart'
import { DailyBarChart } from '@/components/dashboard/DailyBarChart'
import { AccountBalanceChart } from '@/components/dashboard/AccountBalanceChart'
import { ProgressHeatmap } from '@/components/dashboard/ProgressHeatmap'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { dateFrom, dateTo, accountIds, displayMode } = useFiltersStore()
  const accountId = accountIds[0]

  const accounts = useAccounts()
  const { stats } = useStats({ dateFrom, dateTo, accountId })
  const { trades } = useTrades({ dateFrom, dateTo, accountId }, 15)
  const { data: equityData } = useEquity({ dateFrom, dateTo, accountId })

  const initialBalance = accounts.find(a => a.id === accountId)?.balance ?? accounts[0]?.balance ?? 0

  const closedTrades  = stats?.closedTrades  ?? 0
  const openTrades    = stats?.openTrades    ?? 0
  const netPnl        = stats?.netPnl        ?? 0
  const grossPnl      = stats?.grossPnl      ?? 0
  const winRate       = stats?.winRate       ?? 0
  const profitFactor  = stats?.profitFactor  ?? 0
  const expectancy    = stats?.expectancy    ?? 0
  const avgWin        = stats?.avgWin        ?? 0
  const avgLoss       = stats?.avgLoss       ?? 0

  const wins   = Math.round(winRate * closedTrades)
  const losses = closedTrades - wins

  const pfDisplay = profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)

  return (
    <main className="flex-1 overflow-auto p-5 flex flex-col gap-4">

      {/* ── TOP: 5 stat cards ── */}
      <div className="grid grid-cols-5 gap-3">

        {/* Net P&L */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Net P&L
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
              {closedTrades}
            </span>
          </p>
          <p className="text-2xl font-bold" style={{
            color: netPnl > 0 ? '#22c55e' : netPnl < 0 ? '#ef4444' : 'var(--text-primary)'
          }}>
            {formatCurrency(netPnl)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Gross: {formatCurrency(grossPnl)}
          </p>
        </div>

        {/* Trade Expectancy */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Trade Expectancy</p>
          <p className="text-2xl font-bold" style={{
            color: expectancy > 0 ? '#22c55e' : expectancy < 0 ? '#ef4444' : 'var(--text-primary)'
          }}>
            {formatCurrency(expectancy)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Par trade fermé</p>
        </div>

        {/* Profit Factor */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Profit Factor</p>
          <p className="text-2xl font-bold" style={{
            color: profitFactor >= 1.5 ? '#22c55e' : profitFactor > 0 && profitFactor < 1 ? '#ef4444' : 'var(--text-primary)'
          }}>
            {pfDisplay}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Avg win: {formatCurrency(avgWin)}
          </p>
        </div>

        {/* Win Rate */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Win %</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {(winRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: '#22c55e' }}>{wins}W</span>
            {' / '}
            <span style={{ color: '#ef4444' }}>{losses}L</span>
          </p>
        </div>

        {/* Avg Win / Avg Loss */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Avg Win / Avg Loss</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {closedTrades > 0 && avgLoss !== 0
              ? Math.abs(avgWin / avgLoss).toFixed(1)
              : '—'}
          </p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs" style={{ color: '#22c55e' }}>{formatCurrency(avgWin)}</span>
            <span className="text-xs" style={{ color: '#ef4444' }}>{formatCurrency(avgLoss)}</span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Progress Heatmap + Cumulative P&L ── */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <ProgressHeatmap accountId={accountId} />
        </div>
        <div style={{ width: 320, flexShrink: 0 }}>
          <PnlAreaChart data={equityData} />
        </div>
      </div>

      {/* ── ROW 3: Daily P&L bars + Account Balance ── */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <DailyBarChart data={equityData} />
        </div>
        <div style={{ width: 320, flexShrink: 0 }}>
          <AccountBalanceChart data={equityData} initialBalance={initialBalance} />
        </div>
      </div>

      {/* ── BOTTOM: Recent trades + Calendar ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: Recent trades */}
        <div className="flex-1 flex flex-col min-w-0 rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Tabs header */}
          <div className="flex items-center border-b px-4 pt-3 gap-4"
            style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold pb-2 border-b-2 border-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}>
              Open Positions
            </span>
            <span className="text-sm pb-2" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
              Recent Trades
            </span>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1">
            {trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun trade</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Clique sur &quot;+ Add Trade&quot; dans la sidebar
                </span>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Symbole', 'Side', 'Entrée', 'Sortie', 'Net P&L', 'R'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-medium"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(trade.entry_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {trade.symbol}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <Badge style={{
                          background: trade.side === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: trade.side === 'long' ? '#22c55e' : '#ef4444',
                          border: 'none', fontSize: 10,
                        }}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {trade.entry_price}
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {trade.exit_price ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-xs font-bold" style={{
                        color: (trade.net_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444'
                      }}>
                        {trade.net_pnl != null ? formatCurrency(trade.net_pnl) : '—'}
                      </td>
                      <td className="px-4 py-2 text-xs font-medium" style={{
                        color: (trade.r_multiple ?? 0) >= 0 ? '#22c55e' : '#ef4444'
                      }}>
                        {trade.r_multiple != null
                          ? `${trade.r_multiple >= 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Calendar */}
        <div style={{ width: 420, flexShrink: 0 }}>
          <CalendarWidget accountId={accountId} displayMode={displayMode} />
        </div>
      </div>
    </main>
  )
}

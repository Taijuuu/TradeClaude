'use client'
import { useState, useEffect } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useStats } from '@/hooks/useStats'
import { StatCard } from '@/components/dashboard/StatCard'
import { WinRateDonut } from '@/components/dashboard/WinRateDonut'
import { CurrentStreak } from '@/components/dashboard/CurrentStreak'
import { PerformanceRadar } from '@/components/dashboard/PerformanceRadar'
import { PnlAreaChart } from '@/components/dashboard/PnlAreaChart'
import { DailyBarChart } from '@/components/dashboard/DailyBarChart'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

export default function DashboardPage() {
  const { dateFrom, dateTo, accountIds, displayMode } = useFiltersStore()
  const accountId = accountIds[0]

  const { stats } = useStats({ dateFrom, dateTo, accountId })
  const [equity, setEquity] = useState<EquityPoint[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (accountId) params.set('accountId', accountId)
    fetch(`/api/stats/equity?${params}`)
      .then(r => r.json())
      .then(d => setEquity(Array.isArray(d.data) ? d.data : []))
      .catch(() => setEquity([]))
  }, [dateFrom, dateTo, accountId])

  // Always compute safe values — never hide widgets
  const s = stats
  const closedTrades = s?.closedTrades ?? 0
  const wins = s ? Math.round((s.winRate ?? 0) * closedTrades) : 0
  const losses = closedTrades - wins
  const netPnl = s?.netPnl ?? 0
  const profitFactor = s?.profitFactor ?? 0
  const winRate = s?.winRate ?? 0
  const avgWin = s?.avgWin ?? 0
  const avgLoss = s?.avgLoss ?? 0
  const expectancy = s?.expectancy ?? 0
  const avgRMultiple = s?.avgRMultiple ?? 0
  const performanceScore = s?.performanceScore ?? 0
  const currentStreak = s?.currentStreak ?? { type: 'none' as const, count: 0 }
  const consecutiveWins = s?.consecutiveWins ?? 0
  const consecutiveLosses = s?.consecutiveLosses ?? 0

  const consistency = (consecutiveWins > 0 || consecutiveLosses > 0)
    ? consecutiveWins / (consecutiveWins + consecutiveLosses)
    : 0

  return (
    <main className="flex-1 overflow-auto p-4">
      <div className="flex gap-4 min-h-0">

        {/* ── LEFT COLUMN (58%): Calendar + Charts ── */}
        <div className="flex flex-col gap-3" style={{ width: '58%', flexShrink: 0 }}>
          <CalendarWidget accountId={accountId} displayMode={displayMode} />
          <div className="grid grid-cols-2 gap-3">
            <PnlAreaChart data={equity} />
            <DailyBarChart data={equity} />
          </div>
        </div>

        {/* ── RIGHT COLUMN (42%): Stat widgets ── */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Net P&L */}
          <StatCard
            label="Net P&L"
            value={formatCurrency(netPnl)}
            sub={`${closedTrades} trade${closedTrades !== 1 ? 's' : ''} fermé${closedTrades !== 1 ? 's' : ''}`}
            positive={netPnl > 0 ? true : netPnl < 0 ? false : null}
          />

          {/* Profit Factor */}
          <StatCard
            label="Profit Factor"
            value={closedTrades > 0 ? (profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)) : '0.00'}
            sub={closedTrades > 0
              ? `Avg win: ${formatCurrency(avgWin)}  |  Avg loss: ${formatCurrency(Math.abs(avgLoss))}`
              : 'Avg win: $0.00  |  Avg loss: $0.00'}
            positive={profitFactor >= 1.5 ? true : profitFactor > 0 && profitFactor < 1 ? false : null}
          />

          {/* Win Rate by Trades */}
          <WinRateDonut
            winRate={winRate}
            wins={wins}
            losses={losses}
            label="Win % by Trades"
          />

          {/* Current Streak */}
          <CurrentStreak
            streak={currentStreak}
            consecutiveWins={consecutiveWins}
            consecutiveLosses={consecutiveLosses}
          />

          {/* Expectancy */}
          <StatCard
            label="Trade Expectancy"
            value={formatCurrency(expectancy)}
            sub="Par trade fermé"
            positive={expectancy > 0 ? true : expectancy < 0 ? false : null}
          />

          {/* Performance Radar */}
          <PerformanceRadar
            winRate={winRate}
            profitFactor={profitFactor === Infinity ? 3 : Math.min(Math.max(profitFactor, 0), 3)}
            expectancy={expectancy}
            avgRMultiple={avgRMultiple}
            consistency={consistency}
            score={performanceScore}
          />

        </div>
      </div>
    </main>
  )
}

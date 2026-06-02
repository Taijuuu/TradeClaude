'use client'
import { useMemo } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useStats } from '@/hooks/useStats'
import { useTrades } from '@/hooks/useTrades'
import { formatCurrency } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

export default function ReportsPage() {
  const { dateFrom, dateTo, accountIds } = useFiltersStore()
  const accountId = accountIds[0]
  const { stats } = useStats({ dateFrom, dateTo, accountId })
  const { trades, loading } = useTrades({ dateFrom, dateTo, accountId, status: 'closed' }, 500)

  // Equity curve: cumulative P&L sorted by exit_date
  const equityCurve = useMemo(() => {
    const sorted = [...trades]
      .filter(t => t.exit_date && t.net_pnl != null)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime())
    let cum = 0
    return sorted.map(t => {
      cum += t.net_pnl!
      return {
        date: new Date(t.exit_date!).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        cumPnl: parseFloat(cum.toFixed(2)),
      }
    })
  }, [trades])

  // Monthly P&L
  const monthlyPnl = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) {
      if (!t.exit_date || t.net_pnl == null) continue
      const key = new Date(t.exit_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      map.set(key, (map.get(key) ?? 0) + t.net_pnl)
    }
    return Array.from(map.entries()).map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
  }, [trades])

  const topSymbols = stats?.topSymbols ?? []
  const emotionBreakdown = stats?.emotionBreakdown ?? []

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

  if (loading) {
    return (
      <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      </main>
    )
  }

  if (trades.length === 0) {
    return (
      <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun trade fermé dans cette période.</p>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto p-5 flex flex-col gap-4">

      {/* Equity Curve */}
      <div className="rounded-lg p-4" style={cardStyle}>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Courbe d&apos;equity</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={equityCurve} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `${v}€`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}
              labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [formatCurrency(typeof v === 'number' ? v : 0), 'P&L cumulé']}
            />
            <Line
              type="monotone"
              dataKey="cumPnl"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly P&L */}
      {monthlyPnl.length > 0 && (
        <div className="rounded-lg p-4" style={cardStyle}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>P&L par mois</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyPnl} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [formatCurrency(typeof v === 'number' ? v : 0), 'Net P&L']}
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {monthlyPnl.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Top Symboles */}
        {topSymbols.length > 0 && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Top symboles</p>
            <table className="w-full">
              <thead>
                <tr>
                  {['Symbole', 'Trades', 'Win%', 'Net P&L'].map(h => (
                    <th key={h} className="text-left text-xs pb-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSymbols.slice(0, 8).map(s => (
                  <tr key={s.symbol} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.symbol}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{s.trades}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{(s.winRate * 100).toFixed(0)}%</td>
                    <td className="py-1.5 text-xs font-medium" style={{ color: s.netPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(s.netPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Émotions */}
        {emotionBreakdown.length > 0 && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Répartition émotions</p>
            <table className="w-full">
              <thead>
                <tr>
                  {['Émotion', 'Trades', 'Win%', 'P&L'].map(h => (
                    <th key={h} className="text-left text-xs pb-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emotionBreakdown.map(e => (
                  <tr key={e.emotion} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>{e.emotion}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{e.count}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{(e.winRate * 100).toFixed(0)}%</td>
                    <td className="py-1.5 text-xs font-medium" style={{ color: e.netPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(e.netPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

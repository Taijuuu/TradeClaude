'use client'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { ScatterPoint } from '@/hooks/useScatter'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

interface Props { points: ScatterPoint[] }

export function TradeDurationChart({ points }: Props) {
  const isEmpty = points.length === 0

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Trade Duration Performance
      </span>
      <div className="h-44 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              dataKey="durationMinutes"
              type="number"
              domain={[0, 'auto']}
              stroke="#94a3b8"
              tick={{ fontSize: 9 }}
              tickFormatter={formatDuration}
              name="Durée"
            />
            <YAxis
              dataKey="netPnl"
              type="number"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={v => `$${v}`}
              width={48}
              name="P&L"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v, name) => [
                name === 'netPnl' ? formatCurrency(v as number) : formatDuration(v as number),
                name === 'netPnl' ? 'Net P&L' : 'Durée',
              ]}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Scatter data={points} name="trades">
              {points.map((p, i) => (
                <Cell key={i} fill={p.netPnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Aucun trade</span>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { useFmt } from '@/hooks/useFmt'
import type { ScatterPoint } from '@/hooks/useScatter'

function minutesToLabel(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, '0')
  const min = (m % 60).toString().padStart(2, '0')
  return `${h}:${min}`
}

interface Props { points: ScatterPoint[] }

export function TradeTimeChart({ points }: Props) {
  const fmt = useFmt()
  const isEmpty = points.length === 0

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Trade Time Performance
      </span>
      <div className="h-44 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              dataKey="timeMinutes"
              type="number"
              domain={['auto', 'auto']}
              stroke="#94a3b8"
              tick={{ fontSize: 9 }}
              tickFormatter={minutesToLabel}
              name="Heure"
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
                name === 'netPnl' ? fmt(v as number) : minutesToLabel(v as number),
                name === 'netPnl' ? 'Net P&L' : 'Heure',
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

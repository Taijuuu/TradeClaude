'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

interface DailyBarChartProps {
  data: EquityPoint[]
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  const formatted = data.map(d => ({
    ...d,
    dateLabel: format(new Date(d.date), 'dd/MM'),
  }))

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Daily P&L
      </span>
      <div className="h-40 relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Aucun trade fermé
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} width={50} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
                formatter={(v, name) => [
                  formatCurrency(v as number),
                  name === 'dailyPnl' ? 'Daily' : 'Cumulative',
                ]}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
              <Bar dataKey="dailyPnl" radius={[2, 2, 0, 0]}>
                {formatted.map((d, i) => (
                  <Cell key={i} fill={d.dailyPnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="cumPnl" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

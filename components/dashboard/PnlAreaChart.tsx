'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

interface PnlAreaChartProps {
  data: EquityPoint[]
}

export function PnlAreaChart({ data }: PnlAreaChartProps) {
  const isEmpty = data.length === 0
  const formatted = isEmpty
    ? [{ dateLabel: '', cumPnl: 0, dailyPnl: 0, date: '' }]
    : data.map(d => ({ ...d, dateLabel: format(new Date(d.date), 'dd/MM') }))

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Cumulative Net P&L
      </span>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={v => `$${v}`}
              width={50}
              domain={isEmpty ? [-100, 100] : ['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v) => [formatCurrency(v as number), 'Cum. P&L']}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            {!isEmpty && (
              <Area type="monotone" dataKey="cumPnl" stroke="#22c55e" strokeWidth={2} fill="url(#pnlGrad)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Ajoutez un trade pour voir la courbe
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

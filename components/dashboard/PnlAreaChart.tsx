'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import { format } from 'date-fns'
import { useFmt } from '@/hooks/useFmt'
import type { EquityPoint } from '@/types'

interface PnlAreaChartProps {
  data: EquityPoint[]
}

function yDomain(data: { cumPnl: number }[]): [number, number] {
  if (data.length === 0) return [-100, 100]
  const vals = data.map(d => d.cumPnl)
  const min = Math.min(0, ...vals)
  const max = Math.max(0, ...vals)
  const pad = Math.max(Math.abs(max - min) * 0.25, 50)
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

export function PnlAreaChart({ data }: PnlAreaChartProps) {
  const fmt = useFmt()
  const isEmpty = data.length === 0
  const formatted = isEmpty
    ? [{ dateLabel: '', cumPnl: 0, dailyPnl: 0, date: '' }]
    : data.map(d => ({ ...d, dateLabel: format(new Date(d.date), 'dd/MM') }))

  const lastVal = isEmpty ? 0 : formatted[formatted.length - 1].cumPnl
  const isPositive = lastVal >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  const domain = yDomain(isEmpty ? [] : formatted)

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cumulative Net P&L</span>
        {!isEmpty && (
          <span className="text-xs font-bold" style={{ color }}>{fmt(lastVal)}</span>
        )}
      </div>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={v => `$${v}`}
              width={52}
              domain={domain}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              formatter={(v) => [fmt(v as number), 'Cum. P&L']}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            {!isEmpty && (
              <Area
                type="monotone"
                dataKey="cumPnl"
                stroke={color}
                strokeWidth={2}
                fill="url(#pnlGrad)"
                dot={formatted.length === 1 ? <Dot r={4} fill={color} /> : false}
                activeDot={{ r: 4 }}
              />
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

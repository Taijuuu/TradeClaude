'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useFmt } from '@/hooks/useFmt'
import type { EquityPoint } from '@/types'

interface DailyBarChartProps {
  data: EquityPoint[]
}

function yDomain(data: { dailyPnl: number }[]): [number, number] {
  if (data.length === 0) return [-100, 100]
  const vals = data.map(d => d.dailyPnl)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = Math.max(Math.abs(max - min) * 0.25, Math.abs(min) * 0.15, 50)
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  const fmt = useFmt()
  const isEmpty = data.length === 0
  const formatted = isEmpty
    ? [{ dateLabel: '', dailyPnl: 0, cumPnl: 0, date: '' }]
    : data.map(d => ({ ...d, dateLabel: format(new Date(d.date), 'dd/MM') }))

  const domain = yDomain(isEmpty ? [] : formatted)

  return (
    <div className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Daily P&L
      </span>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
              formatter={(v, name) => [
                fmt(v as number),
                name === 'dailyPnl' ? 'Daily P&L' : 'Cumul',
              ]}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            {!isEmpty && (
              <>
                <Bar dataKey="dailyPnl" maxBarSize={40} radius={[3, 3, 0, 0]}>
                  {formatted.map((d, i) => (
                    <Cell key={i} fill={d.dailyPnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumPnl" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Ajoutez un trade pour voir les barres
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

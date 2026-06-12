'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useFmt } from '@/hooks/useFmt'
import type { EquityPoint } from '@/types'

interface DrawdownChartProps {
  data: EquityPoint[]
  initialBalance: number
}

export function DrawdownChart({ data, initialBalance }: DrawdownChartProps) {
  const fmt = useFmt()
  const isEmpty = data.length === 0

  // Compute drawdown at each point
  let peak = initialBalance
  const formatted = data.map(d => {
    const equity = initialBalance + d.cumPnl
    if (equity > peak) peak = equity
    const drawdown = parseFloat((equity - peak).toFixed(2))
    return {
      dateLabel: format(new Date(d.date), 'dd/MM'),
      drawdown,
    }
  })

  const maxDrawdown = formatted.length > 0
    ? Math.min(...formatted.map(d => d.drawdown))
    : 0

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Drawdown
        </span>
        {maxDrawdown < 0 && (
          <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
            Max : {fmt(maxDrawdown)}
          </span>
        )}
      </div>

      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={isEmpty ? [{ dateLabel: '', drawdown: 0 }] : formatted}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={fmt.axis}
              width={52}
              domain={[isEmpty ? -100 : 'auto', 0]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v) => [fmt(v as number), 'Drawdown']}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            {!isEmpty && (
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#ddGrad)"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Aucun trade fermé
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import { format } from 'date-fns'
import { useFmt } from '@/hooks/useFmt'
import type { EquityPoint } from '@/types'

interface AccountBalanceChartProps {
  data: EquityPoint[]
  initialBalance: number
}

function makeYFormatter(symbol: string) {
  return (v: number) => {
    const abs = Math.abs(v)
    if (abs >= 1000) return `${symbol}${(v / 1000).toFixed(1)}k`
    return `${symbol}${v.toFixed(0)}`
  }
}

export function AccountBalanceChart({ data, initialBalance }: AccountBalanceChartProps) {
  const fmt = useFmt()
  const isEmpty = data.length === 0

  const formatted = isEmpty
    ? [{ dateLabel: '', balance: initialBalance || 0 }]
    : data.map(d => ({
        dateLabel: format(new Date(d.date), 'dd/MM'),
        balance: parseFloat((initialBalance + d.cumPnl).toFixed(2)),
      }))

  const lastBalance = isEmpty ? (initialBalance || 0) : formatted[formatted.length - 1].balance
  const isPositive = lastBalance >= (initialBalance || 0)
  const color = isPositive ? '#6366f1' : '#ef4444'

  // Domain with padding
  const vals = formatted.map(d => d.balance)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = Math.max(Math.abs(max - min) * 0.25, 50)
  const domain: [number, number] = [Math.floor(min - pad), Math.ceil(max + pad)]

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Account Balance</span>
        {!isEmpty && (
          <span className="text-xs font-bold" style={{ color }}>{fmt(lastBalance)}</span>
        )}
      </div>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={makeYFormatter(fmt.symbol)}
              width={52}
              domain={domain}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              formatter={(v) => [fmt(v as number), 'Solde']}
            />
            {initialBalance > 0 && (
              <ReferenceLine y={initialBalance} stroke="#6b7280" strokeDasharray="4 4" />
            )}
            <Area
              type="monotone"
              dataKey="balance"
              stroke={color}
              strokeWidth={2}
              fill="url(#balGrad)"
              dot={formatted.length === 1 ? <Dot r={4} fill={color} /> : false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Aucun trade fermé</span>
          </div>
        )}
      </div>
      {!isEmpty && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Départ : {fmt(initialBalance)}
          </span>
          <span className="text-[10px] font-medium" style={{ color }}>
            Actuel : {fmt(lastBalance)}
          </span>
        </div>
      )}
    </div>
  )
}

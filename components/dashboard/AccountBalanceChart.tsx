'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { EquityPoint } from '@/types'

interface AccountBalanceChartProps {
  data: EquityPoint[]
  initialBalance: number
}

export function AccountBalanceChart({ data, initialBalance }: AccountBalanceChartProps) {
  const isEmpty = data.length === 0

  const formatted = isEmpty
    ? [{ dateLabel: '', balance: initialBalance }]
    : data.map(d => ({
        dateLabel: format(new Date(d.date), 'dd/MM'),
        balance: parseFloat((initialBalance + d.cumPnl).toFixed(2)),
      }))

  const isPositive = !isEmpty && formatted[formatted.length - 1].balance >= initialBalance

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
        Account Balance
      </span>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              width={44}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v) => [formatCurrency(v as number), 'Solde']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? '#6366f1' : '#ef4444'}
              strokeWidth={2}
              fill="url(#balGrad)"
              dot={false}
            />
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
      {!isEmpty && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Départ : {formatCurrency(initialBalance)}
          </span>
          <span className="text-[10px] font-medium" style={{
            color: formatted[formatted.length - 1].balance >= initialBalance ? '#22c55e' : '#ef4444'
          }}>
            Actuel : {formatCurrency(formatted[formatted.length - 1].balance)}
          </span>
        </div>
      )}
    </div>
  )
}

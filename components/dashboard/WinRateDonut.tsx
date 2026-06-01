'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface WinRateDonutProps {
  winRate: number
  wins: number
  losses: number
  label?: string
}

export function WinRateDonut({ winRate, wins, losses, label = 'Win % by Trades' }: WinRateDonutProps) {
  const pct = Math.round(winRate * 100)
  const hasData = wins > 0 || losses > 0
  const data = hasData
    ? [{ name: 'Wins', value: wins }, { name: 'Losses', value: losses }]
    : [{ name: 'No data', value: 1 }]

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={40}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {hasData ? (
                  <>
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </>
                ) : (
                  <Cell fill="#2d3148" />
                )}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {pct}%
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>WINRATE</span>
          </div>
        </div>
        <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {wins} winners
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {losses} losers
          </div>
        </div>
      </div>
    </div>
  )
}

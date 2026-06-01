'use client'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'

interface PerformanceRadarProps {
  winRate: number
  profitFactor: number
  expectancy: number
  avgRMultiple: number
  consistency: number
  score: number
}

function norm(val: number, max: number) {
  return Math.min(Math.round((Math.max(val, 0) / max) * 100), 100)
}

export function PerformanceRadar({
  winRate, profitFactor, expectancy, avgRMultiple, consistency, score,
}: PerformanceRadarProps) {
  const pf = profitFactor === Infinity ? 3 : Math.min(Math.max(profitFactor, 0), 3)
  const data = [
    { axis: 'Win %',         value: norm(winRate, 1) },
    { axis: 'Avg Win/Loss',  value: norm(pf, 3) },
    { axis: 'Profit Factor', value: norm(pf, 3) },
    { axis: 'Consistency',   value: Math.round(Math.max(consistency, 0) * 100) },
    { axis: 'R-Multiple',    value: norm(avgRMultiple, 3) },
  ]

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
        Performance Score
      </span>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius={60}>
            <PolarGrid stroke="#2d3148" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Radar
              dataKey="value"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-1">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
        >
          Your Score: {score} / 100
        </span>
      </div>
    </div>
  )
}

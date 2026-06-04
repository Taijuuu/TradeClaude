'use client'
import { useState, useEffect } from 'react'
import { useFmt } from '@/hooks/useFmt'

interface DayData {
  date: string
  netPnl: number
  tradeCount: number
}

interface ProgressHeatmapProps {
  accountId?: string
}

function getCellColor(netPnl: number | undefined): string {
  if (netPnl === undefined) return 'var(--bg-hover)'
  if (netPnl > 500)  return '#15803d'
  if (netPnl > 100)  return '#16a34a'
  if (netPnl > 0)    return '#22c55e'
  if (netPnl < -500) return '#991b1b'
  if (netPnl < -100) return '#dc2626'
  return '#ef4444'
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DAYS   = ['L','M','M','J','V','S','D']

export function ProgressHeatmap({ accountId }: ProgressHeatmapProps) {
  const fmt = useFmt()
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map())
  const [tooltip, setTooltip] = useState<{ day: DayData; x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (accountId) params.set('accountId', accountId)
    fetch(`/api/stats/heatmap?${params}`)
      .then(r => r.json())
      .then(d => {
        const map = new Map<string, DayData>()
        for (const day of d.days ?? []) map.set(day.date, day)
        setDayMap(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  // Build 52-week grid ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the most recent Monday (week start)
  const endSunday = new Date(today)
  endSunday.setDate(today.getDate() + (7 - today.getDay()) % 7)

  const weeks: Date[][] = []
  for (let w = 51; w >= 0; w--) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(endSunday)
      day.setDate(endSunday.getDate() - w * 7 - (6 - d))
      week.push(day)
    }
    weeks.push(week)
  }

  // Month labels
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const m = week[0].getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ label: MONTHS[m], col })
      lastMonth = m
    }
  })

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        Progress Tracker — 52 semaines
      </span>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Chargement...</span>
        </div>
      ) : (
        <div className="relative">
          {/* Month labels */}
          <div className="flex mb-1 ml-6" style={{ gap: 3 }}>
            {weeks.map((_, col) => {
              const label = monthLabels.find(m => m.col === col)
              return (
                <div key={col} style={{ width: 12, flexShrink: 0 }}>
                  {label && (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {label.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col justify-around" style={{ gap: 3, paddingTop: 1 }}>
              {DAYS.map((d, i) => (
                <span key={i} className="text-[9px]" style={{ color: 'var(--text-muted)', lineHeight: '12px' }}>
                  {i % 2 === 0 ? d : ''}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex" style={{ gap: 3 }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: 3 }}>
                  {week.map((date, di) => {
                    const iso = date.toISOString().split('T')[0]
                    const data = dayMap.get(iso)
                    const isFuture = date > today
                    const color = isFuture
                      ? 'transparent'
                      : data ? getCellColor(data.netPnl) : 'var(--bg-hover)'

                    return (
                      <div
                        key={di}
                        style={{
                          width: 12, height: 12,
                          borderRadius: 2,
                          background: color,
                          border: data ? 'none' : isFuture ? 'none' : '1px solid var(--border)',
                          cursor: data ? 'pointer' : 'default',
                        }}
                        onMouseEnter={e => {
                          if (data) setTooltip({ day: data, x: e.clientX, y: e.clientY })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Moins</span>
            {['var(--bg-hover)', '#22c55e', '#16a34a', '#15803d'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: '1px solid var(--border)' }} />
            ))}
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Plus</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-md px-3 py-2 text-xs pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div className="font-medium">{tooltip.day.date}</div>
          <div style={{ color: tooltip.day.netPnl >= 0 ? '#22c55e' : '#ef4444' }}>
            {fmt(tooltip.day.netPnl)}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>{tooltip.day.tradeCount} trade{tooltip.day.tradeCount > 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  )
}

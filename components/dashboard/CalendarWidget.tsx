'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFmt } from '@/hooks/useFmt'
import { useCalendar } from '@/hooks/useCalendar'
import type { CalendarDay, DisplayMode, WeeklySummary } from '@/types'

const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Sem.']

function DayCell({ day, fmt }: { day: CalendarDay; fmt: (v: number) => string }) {
  const isToday = day.date === new Date().toISOString().slice(0, 10)

  if (day.type === 'empty') {
    return <div className="h-[72px] rounded-md" style={{ background: 'transparent' }} />
  }

  const bgColor =
    day.type === 'win'       ? 'rgba(34,197,94,0.1)' :
    day.type === 'loss'      ? 'rgba(239,68,68,0.1)' :
    day.type === 'breakeven' ? 'rgba(107,114,128,0.1)' :
    'var(--bg-hover)'

  const textColor =
    day.type === 'win'  ? '#22c55e' :
    day.type === 'loss' ? '#ef4444' :
    'var(--text-muted)'

  const dayNum = day.date ? parseInt(day.date.slice(-2)) : 0

  return (
    <div
      className={cn(
        'h-[72px] rounded-md p-1.5 flex flex-col gap-0.5 cursor-pointer transition-all hover:brightness-110',
        isToday && 'ring-2 ring-[#7c3aed]'
      )}
      style={{ background: bgColor }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dayNum}</span>
        {day.hasNote && <BookOpen size={9} color="#a78bfa" />}
      </div>
      {day.nbTrades > 0 ? (
        <>
          <span className="text-[10px] font-semibold leading-tight" style={{ color: textColor }}>
            {day.netPnl >= 0 ? `+${fmt(day.netPnl)}` : fmt(day.netPnl)}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            {day.nbTrades} trade{day.nbTrades > 1 ? 's' : ''}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            {Math.round(day.winRate * 100)}%
          </span>
        </>
      ) : (
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>—</span>
      )}
    </div>
  )
}

function WeekCell({ summary, weekNumber, fmt }: { summary: WeeklySummary; weekNumber: number; fmt: (v: number) => string }) {
  return (
    <div
      className="h-[72px] rounded-md p-1.5 flex flex-col items-center justify-center gap-0.5"
      style={{ background: 'rgba(45,49,72,0.5)' }}
    >
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Sem. {weekNumber}</span>
      <span
        className="text-[10px] font-semibold"
        style={{ color: summary.totalPnl >= 0 ? '#22c55e' : '#ef4444' }}
      >
        {summary.totalPnl >= 0 ? '+' : ''}{fmt(summary.totalPnl)}
      </span>
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
        {summary.tradingDays} jour{summary.tradingDays > 1 ? 's' : ''}
      </span>
    </div>
  )
}

/** Placeholder week cell shown when there is no data yet (empty month). */
function EmptyWeekCell() {
  return (
    <div
      className="h-[72px] rounded-md p-1.5 flex flex-col items-center justify-center"
      style={{ background: 'rgba(45,49,72,0.5)' }}
    >
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>—</span>
    </div>
  )
}

/** Returns a blank 42-entry CalendarDay array for the given year/month. */
function buildEmptyDays(year: number, month: number): CalendarDay[] {
  // month is 1-based
  const firstDayOfMonth = new Date(year, month - 1, 1)
  // getDay() returns 0=Sun … 6=Sat; convert to Mon-based (0=Mon … 6=Sun)
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: CalendarDay[] = []

  // Leading empty cells
  for (let i = 0; i < firstWeekday; i++) {
    days.push({ date: null, netPnl: 0, nbTrades: 0, winRate: 0, avgRMultiple: 0, type: 'empty', trades: [], hasNote: false })
  }

  // Actual days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ date: `${year}-${mm}-${dd}`, netPnl: 0, nbTrades: 0, winRate: 0, avgRMultiple: 0, type: 'no-trade', trades: [], hasNote: false })
  }

  // Pad to 42 cells
  while (days.length < 42) {
    days.push({ date: null, netPnl: 0, nbTrades: 0, winRate: 0, avgRMultiple: 0, type: 'empty', trades: [], hasNote: false })
  }

  return days.slice(0, 42)
}

interface CalendarWidgetProps {
  accountId?: string
  displayMode?: DisplayMode
}

export function CalendarWidget({ accountId }: CalendarWidgetProps) {
  const fmt = useFmt()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, loading } = useCalendar(year, month, accountId)

  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleString('fr-FR', {
    month: 'long', year: 'numeric',
  })

  // Always show a grid: use API data when available, otherwise a local skeleton.
  const days: CalendarDay[] = data?.days ?? buildEmptyDays(year, month)
  const weeklySummaries: WeeklySummary[] = data?.weeklySummaries ?? []

  // Monthly stats
  const tradingDays = days.filter(d => d.nbTrades > 0)
  const monthlyPnl  = tradingDays.reduce((s, d) => s + d.netPnl, 0)
  const winDays     = tradingDays.filter(d => d.type === 'win').length

  // Split 42 flat day entries into 6 rows of 7
  const rows: CalendarDay[][] = Array.from({ length: 6 }, (_, w) =>
    days.slice(w * 7, w * 7 + 7)
  )

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Navigation + monthly stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
            {monthLabel}
          </span>
          <button
            onClick={next}
            className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {tradingDays.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: monthlyPnl >= 0 ? '#22c55e' : '#ef4444' }}>
              {monthlyPnl >= 0 ? '+' : ''}{fmt(monthlyPnl)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {tradingDays.length} jour{tradingDays.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: '#22c55e' }}>{winDays}W</span>
              {' / '}
              <span style={{ color: '#ef4444' }}>{tradingDays.length - winDays}L</span>
            </span>
          </div>
        )}
      </div>

      {/* Column headers: 7 days + week summary */}
      <div className="grid grid-cols-8 gap-1">
        {DAY_HEADERS.map(h => (
          <div
            key={h}
            className="text-center text-[10px] font-medium h-5 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Calendar grid — always rendered, loading state only dims it */}
      <div className={cn('flex flex-col gap-1', loading && 'opacity-50')}>
        {rows.map((rowDays, weekIndex) => {
          const summary = weeklySummaries.find(s => s.weekIndex === weekIndex)
          return (
            <div key={weekIndex} className="grid grid-cols-8 gap-1">
              {rowDays.map((day, dayIndex) => (
                <DayCell key={dayIndex} day={day} fmt={fmt} />
              ))}
              {summary ? (
                <WeekCell summary={summary} weekNumber={weekIndex + 1} fmt={fmt} />
              ) : (
                <EmptyWeekCell />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

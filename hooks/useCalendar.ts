'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CalendarResponse } from '@/types'

interface UseCalendarResult {
  data: CalendarResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCalendar(year: number, month: number, accountId?: string): UseCalendarResult {
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    if (accountId) params.set('accountId', accountId)

    fetch(`/api/stats/calendar?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [year, month, accountId, tick])

  return { data, loading, error, refresh }
}

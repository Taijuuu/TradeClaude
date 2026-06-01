'use client'
import { useState, useEffect, useCallback } from 'react'
import type { StatsResponse } from '@/types'

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  assetClass?: string
}

interface UseStatsResult {
  stats: StatsResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useStats(filters: Filters = {}): UseStatsResult {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    const f = JSON.parse(filtersKey) as Filters
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v) })

    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(d => { setStats(d); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [filtersKey, tick])

  return { stats, loading, error, refresh }
}

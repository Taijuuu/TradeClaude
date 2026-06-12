'use client'
import { useState, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'

export interface ScatterPoint {
  timeMinutes: number
  durationMinutes: number
  netPnl: number
}

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
}

export function useScatter(filters: Filters = {}) {
  const [points, setPoints] = useState<ScatterPoint[]>([])
  const [loading, setLoading] = useState(true)
  const dataVersion = useDataStore(s => s.dataVersion)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.dateFrom)  params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo)    params.set('dateTo', filters.dateTo)
    if (filters.accountId) params.set('accountId', filters.accountId)

    fetch(`/api/stats/scatter?${params}`)
      .then(r => r.json())
      .then(d => setPoints(d.points ?? []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false))
  }, [filters.dateFrom, filters.dateTo, filters.accountId, dataVersion])

  return { points, loading }
}

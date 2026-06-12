'use client'
import { useState, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'
import type { EquityPoint } from '@/types'

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
}

export function useEquity(filters: Filters = {}) {
  const [data, setData] = useState<EquityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const dataVersion = useDataStore(s => s.dataVersion)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.accountId) params.set('accountId', filters.accountId)

    fetch(`/api/stats/equity?${params}`)
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [filters.dateFrom, filters.dateTo, filters.accountId, dataVersion])

  return { data, loading }
}

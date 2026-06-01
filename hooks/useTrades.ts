'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Trade } from '@/types'

interface Filters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  assetClass?: string
  side?: string
  status?: string
  symbol?: string
  emotion?: string
  minR?: string
  maxR?: string
  strategyId?: string
  tagId?: string
}

interface UseTradesResult {
  trades: Trade[]
  total: number
  loading: boolean
  error: string | null
  page: number
  setPage: (p: number) => void
  refresh: () => void
}

export function useTrades(filters: Filters = {}, limit = 50): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    const f = JSON.parse(filtersKey) as Filters
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v) })

    fetch(`/api/trades?${params}`)
      .then(r => r.json())
      .then(d => { setTrades(d.trades ?? []); setTotal(d.total ?? 0); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [page, limit, filtersKey, tick])

  return { trades, total, loading, error, page, setPage, refresh }
}

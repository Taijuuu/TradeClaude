'use client'
import { useFiltersStore } from '@/store/filtersStore'
import { formatCurrency } from '@/lib/utils'

export function useFmt() {
  const displayMode = useFiltersStore(s => s.displayMode)
  const currency = displayMode === 'euro' ? 'EUR' : 'USD'
  const symbol = displayMode === 'euro' ? '€' : '$'
  const fmt = (v: number) => formatCurrency(v, currency)
  return Object.assign(fmt, { symbol, currency })
}

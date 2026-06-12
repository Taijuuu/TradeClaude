'use client'
import { useFiltersStore } from '@/store/filtersStore'
import { formatCurrency } from '@/lib/utils'

export function useFmt() {
  const displayMode = useFiltersStore(s => s.displayMode)
  const currency = displayMode === 'euro' ? 'EUR' : 'USD'
  const symbol = displayMode === 'euro' ? '€' : '$'
  const fmt = (v: number) => formatCurrency(v, currency)
  // Format compact pour les axes de graphiques : $1.2k, -$350…
  const axis = (v: number) => {
    const sign = v < 0 ? '-' : ''
    const abs = Math.abs(v)
    if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`
    return `${sign}${symbol}${abs.toFixed(0)}`
  }
  return Object.assign(fmt, { symbol, currency, axis })
}

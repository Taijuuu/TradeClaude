import { create } from 'zustand'
import { startOfMonth, format } from 'date-fns'
import type { AssetClass, DisplayMode } from '@/types'

interface FiltersState {
  dateFrom: string
  dateTo: string
  accountIds: string[]
  assetClasses: AssetClass[]
  displayMode: DisplayMode
}

interface FiltersActions {
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
  setAccountIds: (ids: string[]) => void
  setAssetClasses: (classes: AssetClass[]) => void
  setDisplayMode: (mode: DisplayMode) => void
  reset: () => void
}

function getDefaultState(): FiltersState {
  return {
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    accountIds: [],
    assetClasses: [],
    displayMode: 'dollar',
  }
}

export const useFiltersStore = create<FiltersState & FiltersActions>((set) => ({
  ...getDefaultState(),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setAccountIds: (accountIds) => set({ accountIds }),
  setAssetClasses: (assetClasses) => set({ assetClasses }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  reset: () => set(getDefaultState()),
}))

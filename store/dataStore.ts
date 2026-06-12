import { create } from 'zustand'

// Version globale des données de trading. Toute mutation (ajout, édition,
// suppression, sync MT5) doit appeler bumpData() — tous les hooks de données
// (stats, trades, equity, calendrier, heatmap, scatter) s'y abonnent et
// re-fetchent automatiquement.
interface DataState {
  dataVersion: number
  bumpData: () => void
}

export const useDataStore = create<DataState>((set) => ({
  dataVersion: 0,
  bumpData: () => set(s => ({ dataVersion: s.dataVersion + 1 })),
}))

'use client'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useDataStore } from '@/store/dataStore'

const SYNC_INTERVAL_MS = 5 * 60 * 1000
const MIN_GAP_MS = 2 * 60 * 1000
const STORAGE_KEY = 'mt5-last-auto-sync'

// Synchronise les trades MT5 automatiquement : au chargement de l'app puis
// toutes les 5 minutes. Quand de nouveaux trades arrivent, bumpData() force
// le re-fetch de tous les graphiques et stats. Silencieux en cas d'erreur
// (MT5 pas configuré, réseau...) pour ne pas polluer l'UI.
export function AutoSync() {
  const syncing = useRef(false)

  useEffect(() => {
    async function sync() {
      if (syncing.current) return
      // Évite de re-déclencher à chaque navigation entre pages
      const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0)
      if (Date.now() - last < MIN_GAP_MS) return

      syncing.current = true
      try {
        const res = await fetch('/api/mt5/sync', { method: 'POST' })
        if (!res.ok) return
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
        const data = await res.json()
        const total = (data.inserted ?? 0) + (data.updated ?? 0)
        if (total > 0) {
          useDataStore.getState().bumpData()
          toast.success(`MT5 : ${data.inserted ?? 0} nouveau${(data.inserted ?? 0) > 1 ? 'x' : ''} trade${(data.inserted ?? 0) > 1 ? 's' : ''}, ${data.updated ?? 0} mis à jour`)
        }
      } catch {
        // silencieux
      } finally {
        syncing.current = false
      }
    }

    sync()
    const id = setInterval(sync, SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}

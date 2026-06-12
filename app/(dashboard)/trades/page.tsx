'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFiltersStore } from '@/store/filtersStore'
import { useDataStore } from '@/store/dataStore'
import { useTrades } from '@/hooks/useTrades'
import { TradeTable } from '@/components/trades/TradeTable'
import { TradeForm } from '@/components/trades/TradeForm'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Trade } from '@/types'

function useLastSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/mt5/status')
      .then(r => r.json())
      .then(d => setLastSyncAt(d.lastSyncAt ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  return { lastSyncAt, reload: load }
}

function formatSyncAge(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

export default function TradesPage() {
  const { dateFrom, dateTo, accountIds, assetClasses } = useFiltersStore()
  const accountId = accountIds[0]
  const assetClass = assetClasses[0]

  const { trades, total, loading, page, setPage, refresh } = useTrades({
    dateFrom, dateTo, accountId, assetClass,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [syncing, setSyncing] = useState(false)
  const { lastSyncAt, reload: reloadStatus } = useLastSync()

  // Ouvre le formulaire quand on arrive via "Add Trade" de la sidebar (/trades?add=1)
  const router = useRouter()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('add') === '1') {
      setFormOpen(true)
      router.replace('/trades')
    }
  }, [router])

  function handleEdit(trade: Trade) {
    setEditingTrade(trade)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingTrade(null)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/mt5/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Sync échouée')
      } else {
        const total = (data.inserted ?? 0) + (data.updated ?? 0)
        toast.success(
          total === 0
            ? 'Aucun nouveau trade'
            : `${data.inserted} importé${data.inserted !== 1 ? 's' : ''}, ${data.updated} mis à jour`
        )
        useDataStore.getState().bumpData()
        refresh()
        reloadStatus()
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {total} trade{total !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-3">
          {/* MT5 Sync button */}
          <div className="flex flex-col items-end gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={syncing}
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin mr-1' : 'mr-1'} />
              {syncing ? 'Sync...' : 'Sync MT5'}
            </Button>
            {lastSyncAt && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {formatSyncAge(lastSyncAt)}
              </span>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => setFormOpen(true)}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus size={14} className="mr-1" /> Add Trade
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <TradeTable
            trades={trades}
            loading={loading}
            onEdit={handleEdit}
            onDeleted={refresh}
          />
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="ghost" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ color: 'var(--text-muted)' }}
            >
              Précédent
            </Button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page}</span>
            <Button
              variant="ghost" size="sm"
              disabled={page * 50 >= total}
              onClick={() => setPage(page + 1)}
              style={{ color: 'var(--text-muted)' }}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>

      {/* TradeForm drawer */}
      <TradeForm
        open={formOpen}
        onClose={handleClose}
        trade={editingTrade}
        onSaved={refresh}
      />
    </main>
  )
}

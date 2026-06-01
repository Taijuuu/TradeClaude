'use client'
import { useState } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useTrades } from '@/hooks/useTrades'
import { TradeTable } from '@/components/trades/TradeTable'
import { TradeForm } from '@/components/trades/TradeForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Trade } from '@/types'

export default function TradesPage() {
  const { dateFrom, dateTo, accountIds, assetClasses } = useFiltersStore()
  const accountId = accountIds[0]
  const assetClass = assetClasses[0]

  const { trades, total, loading, page, setPage, refresh } = useTrades({
    dateFrom, dateTo, accountId, assetClass,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)

  function handleEdit(trade: Trade) {
    setEditingTrade(trade)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingTrade(null)
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
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} className="mr-1" /> Add Trade
        </Button>
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

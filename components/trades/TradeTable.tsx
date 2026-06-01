'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatR, formatDate } from '@/lib/utils'
import type { Trade } from '@/types'

interface TradeTableProps {
  trades: Trade[]
  loading: boolean
  onEdit: (trade: Trade) => void
  onDeleted: () => void
}

export function TradeTable({ trades, loading, onEdit, onDeleted }: TradeTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce trade ?')) return
    setDeleting(id)
    const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
    toast.success('Trade supprimé')
    onDeleted()
  }

  const th = 'text-left px-3 py-2 text-xs font-medium whitespace-nowrap'
  const td = 'px-3 py-2 text-xs whitespace-nowrap'

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</span>
      </div>
    )
  }

  if (!loading && trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun trade</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Clique sur &quot;+ Add Trade&quot; pour commencer
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead style={{ borderBottom: '1px solid var(--border)' }}>
          <tr>
            {[
              'Date', 'Symbole', 'Side', 'Asset',
              'Entrée', 'Sortie', 'Qté',
              'Gross P&L', 'Net P&L', 'R', '★',
              'Émotion', 'Statut', 'Actions',
            ].map(h => (
              <th key={h} className={th} style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => (
            <tr
              key={trade.id}
              className="border-b hover:bg-[var(--bg-hover)] transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <td className={td} style={{ color: 'var(--text-muted)' }}>
                {formatDate(trade.entry_date)}
              </td>
              <td className={cn(td, 'font-semibold')} style={{ color: 'var(--text-primary)' }}>
                {trade.symbol}
              </td>
              <td className={td}>
                <Badge style={{
                  background: trade.side === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: trade.side === 'long' ? '#22c55e' : '#ef4444',
                  border: 'none',
                  fontSize: 10,
                }}>
                  {trade.side.toUpperCase()}
                </Badge>
              </td>
              <td className={td} style={{ color: 'var(--text-muted)' }}>{trade.asset_class}</td>
              <td className={td} style={{ color: 'var(--text-muted)' }}>{trade.entry_price}</td>
              <td className={td} style={{ color: 'var(--text-muted)' }}>{trade.exit_price ?? '—'}</td>
              <td className={td} style={{ color: 'var(--text-muted)' }}>{trade.quantity}</td>
              <td className={cn(td, 'font-medium')} style={{
                color: (trade.gross_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444',
              }}>
                {trade.gross_pnl != null ? formatCurrency(trade.gross_pnl) : '—'}
              </td>
              <td className={cn(td, 'font-bold')} style={{
                color: (trade.net_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444',
              }}>
                {trade.net_pnl != null ? formatCurrency(trade.net_pnl) : '—'}
              </td>
              <td className={cn(td, 'font-medium')} style={{
                color: (trade.r_multiple ?? 0) >= 0 ? '#22c55e' : '#ef4444',
              }}>
                {trade.r_multiple != null ? formatR(trade.r_multiple) : '—'}
              </td>
              <td className={td}>
                {trade.rating ? '⭐'.repeat(trade.rating) : '—'}
              </td>
              <td className={td} style={{ color: 'var(--text-muted)' }}>
                {trade.emotion ?? '—'}
              </td>
              <td className={td}>
                <Badge style={{
                  background: trade.status === 'closed' ? 'rgba(34,197,94,0.1)' : 'rgba(124,58,237,0.1)',
                  color: trade.status === 'closed' ? '#22c55e' : '#a78bfa',
                  border: 'none',
                  fontSize: 10,
                }}>
                  {trade.status}
                </Badge>
              </td>
              <td className={td}>
                <div className="flex gap-1">
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6"
                    onClick={() => onEdit(trade)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6"
                    disabled={deleting === trade.id}
                    onClick={() => handleDelete(trade.id)}
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { calcGrossPnl, calcNetPnl, calcRMultiple } from '@/lib/calculations'
import { pnlColor, cn } from '@/lib/utils'
import { useFmt } from '@/hooks/useFmt'
import { useAccounts } from '@/components/layout/AccountsProvider'
import type { Trade, Emotion, AssetClass } from '@/types'

const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: 'confident', label: 'Confiant',  emoji: '😎' },
  { value: 'fearful',   label: 'Craintif',  emoji: '😰' },
  { value: 'impulsive', label: 'Impulsif',  emoji: '😤' },
  { value: 'neutral',   label: 'Neutre',    emoji: '😐' },
  { value: 'greedy',    label: 'Avide',     emoji: '🤑' },
  { value: 'calm',      label: 'Calme',     emoji: '😌' },
  { value: 'anxious',   label: 'Anxieux',   emoji: '😟' },
]

const schema = z.object({
  symbol:        z.string().min(1, 'Symbole requis'),
  side:          z.enum(['long', 'short']),
  status:        z.enum(['open', 'closed']),
  asset_class:   z.enum(['forex', 'stocks', 'crypto', 'futures', 'options']),
  account_id:    z.string().optional(),
  entry_date:    z.string().min(1, 'Date requise'),
  exit_date:     z.string().optional(),
  entry_price:   z.coerce.number().positive('Prix requis'),
  exit_price:    z.coerce.number().optional(),
  quantity:      z.coerce.number().positive('Quantité requise'),
  stop_loss:     z.coerce.number().optional(),
  take_profit:   z.coerce.number().optional(),
  commission:    z.coerce.number().min(0).default(0),
  rating:        z.coerce.number().min(1).max(5).optional(),
  emotion:       z.string().optional(),
  notes:         z.string().optional(),
  setup_notes:   z.string().optional(),
  mistake_notes: z.string().optional(),
}).refine(
  d => d.status === 'open' || (d.exit_price !== undefined && d.exit_date),
  { message: 'Prix et date de sortie requis pour un trade fermé', path: ['exit_price'] }
)

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

interface TradeFormProps {
  open: boolean
  onClose: () => void
  trade?: Trade | null
  onSaved: () => void
}

export function TradeForm({ open, onClose, trade, onSaved }: TradeFormProps) {
  const fmt = useFmt()
  const accounts = useAccounts()
  const isEdit = !!trade
  const [rating, setRating] = useState(0)

  const {
    register, handleSubmit, watch, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { side: 'long', status: 'closed', asset_class: 'forex', commission: 0 },
  })

  useEffect(() => {
    if (open) {
      if (trade) {
        setRating(trade.rating ?? 0)
        reset({
          symbol:        trade.symbol,
          side:          trade.side,
          status:        trade.status,
          asset_class:   trade.asset_class as AssetClass,
          account_id:    trade.account_id ?? undefined,
          entry_date:    trade.entry_date.slice(0, 16),
          exit_date:     trade.exit_date?.slice(0, 16),
          entry_price:   trade.entry_price,
          exit_price:    trade.exit_price ?? undefined,
          quantity:      trade.quantity,
          stop_loss:     trade.stop_loss ?? undefined,
          take_profit:   trade.take_profit ?? undefined,
          commission:    trade.commission,
          emotion:       trade.emotion ?? undefined,
          notes:         trade.notes ?? undefined,
          setup_notes:   trade.setup_notes ?? undefined,
          mistake_notes: trade.mistake_notes ?? undefined,
        })
      } else {
        setRating(0)
        reset({ side: 'long', status: 'closed', asset_class: 'forex', commission: 0 })
      }
    }
  }, [open, trade, reset])

  const [side, status, entryPrice, exitPrice, quantity, stopLoss, commission] =
    watch(['side', 'status', 'entry_price', 'exit_price', 'quantity', 'stop_loss', 'commission'])

  const grossPnl = (status === 'closed' && entryPrice && exitPrice && quantity)
    ? calcGrossPnl(side, +entryPrice, +exitPrice, +quantity)
    : null
  const netPnl = grossPnl != null ? calcNetPnl(grossPnl, +(commission ?? 0)) : null
  const rMultiple = (entryPrice && exitPrice && stopLoss)
    ? calcRMultiple(side, +entryPrice, +exitPrice, +stopLoss)
    : null

  async function onSubmit(data: FormData) {
    const url = isEdit ? `/api/trades/${trade!.id}` : '/api/trades'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, symbol: data.symbol.toUpperCase(), rating: rating || undefined }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error((err as { error?: string }).error ?? 'Erreur lors de la sauvegarde')
      return
    }

    toast.success(isEdit ? 'Trade mis à jour !' : 'Trade ajouté !')
    onSaved()
    onClose()
  }

  const inputStyle = {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }
  const labelStyle = { color: 'var(--text-muted)' }
  const sectionTitle = 'text-xs font-semibold uppercase tracking-wider mb-3'

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        className="w-full max-w-xl overflow-y-auto"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <SheetHeader className="mb-4">
          <SheetTitle style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifier le trade' : 'Nouveau trade'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Section 1: Identité ── */}
          <div>
            <p className={sectionTitle} style={labelStyle}>Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Symbole *</Label>
                <Input
                  placeholder="EURUSD"
                  {...register('symbol')}
                  style={inputStyle}
                  className="uppercase"
                />
                {errors.symbol && <p className="text-xs text-red-400">{errors.symbol.message}</p>}
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Asset class</Label>
                <Controller name="asset_class" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {(['forex', 'stocks', 'crypto', 'futures', 'options'] as AssetClass[]).map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Direction *</Label>
                <Controller name="side" control={control} render={({ field }) => (
                  <div className="flex gap-1">
                    {(['long', 'short'] as const).map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => field.onChange(s)}
                        className="flex-1 py-2 rounded-md text-xs font-semibold transition-colors"
                        style={{
                          background: field.value === s
                            ? (s === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)')
                            : 'var(--bg-hover)',
                          color: field.value === s
                            ? (s === 'long' ? '#22c55e' : '#ef4444')
                            : 'var(--text-muted)',
                          border: `1px solid ${field.value === s ? (s === 'long' ? '#22c55e50' : '#ef444450') : 'var(--border)'}`,
                        }}
                      >
                        {s === 'long' ? 'LONG ↑' : 'SHORT ↓'}
                      </button>
                    ))}
                  </div>
                )} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Statut</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <SelectItem value="closed">Fermé</SelectItem>
                      <SelectItem value="open">Ouvert</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {accounts.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label style={labelStyle}>Compte</Label>
                  <Controller name="account_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Aucun compte" /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Prix ── */}
          <div>
            <p className={sectionTitle} style={labelStyle}>Prix</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Date d&apos;entrée *</Label>
                <Input type="datetime-local" {...register('entry_date')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Prix d&apos;entrée *</Label>
                <Input type="number" step="any" placeholder="1.10000" {...register('entry_price')} style={inputStyle} />
                {errors.entry_price && <p className="text-xs text-red-400">{errors.entry_price.message}</p>}
              </div>
              {status === 'closed' && (
                <>
                  <div className="space-y-1">
                    <Label style={labelStyle}>Date de sortie *</Label>
                    <Input type="datetime-local" {...register('exit_date')} style={inputStyle} />
                  </div>
                  <div className="space-y-1">
                    <Label style={labelStyle}>Prix de sortie *</Label>
                    <Input type="number" step="any" placeholder="1.11000" {...register('exit_price')} style={inputStyle} />
                    {errors.exit_price && <p className="text-xs text-red-400">{errors.exit_price.message}</p>}
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label style={labelStyle}>Quantité *</Label>
                <Input type="number" step="any" placeholder="10000" {...register('quantity')} style={inputStyle} />
                {errors.quantity && <p className="text-xs text-red-400">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Commission</Label>
                <Input type="number" step="any" placeholder="0" {...register('commission')} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Risk ── */}
          <div>
            <p className={sectionTitle} style={labelStyle}>Risk</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={labelStyle}>Stop Loss</Label>
                <Input type="number" step="any" placeholder="1.09000" {...register('stop_loss')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Take Profit</Label>
                <Input type="number" step="any" placeholder="1.12000" {...register('take_profit')} style={inputStyle} />
              </div>
            </div>
            {rMultiple !== null && (
              <div className="mt-2 px-2 py-1.5 rounded text-xs"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                R-Multiple :{' '}
                <span className={pnlColor(rMultiple)} style={{ fontWeight: 700 }}>
                  {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                </span>
              </div>
            )}
          </div>

          {/* ── Section 4: Résultats live ── */}
          {grossPnl !== null && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-hover)' }}>
              <p className={sectionTitle} style={labelStyle}>Résultats</p>
              <div className="flex justify-between text-sm">
                <span style={labelStyle}>Gross P&L</span>
                <span className={pnlColor(grossPnl)} style={{ fontWeight: 600 }}>{fmt(grossPnl)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={labelStyle}>Net P&L</span>
                <span className={cn('text-base font-bold', pnlColor(netPnl ?? 0))}>
                  {fmt(netPnl ?? 0)}
                </span>
              </div>
            </div>
          )}

          {/* ── Section 5: Psychologie ── */}
          <div>
            <p className={sectionTitle} style={labelStyle}>Psychologie</p>
            <div className="space-y-3">
              <div>
                <Label style={labelStyle}>Rating</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button"
                      onClick={() => setRating(n === rating ? 0 : n)}
                      className="text-xl transition-opacity hover:opacity-80"
                      style={{ opacity: n <= rating ? 1 : 0.25 }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label style={labelStyle}>Émotion</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {EMOTIONS.map(e => (
                    <Controller key={e.value} name="emotion" control={control} render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value === e.value ? '' : e.value)}
                        className="px-2 py-1 rounded-md text-xs transition-all"
                        style={{
                          background: field.value === e.value ? 'var(--accent)' : 'var(--bg-hover)',
                          color: field.value === e.value ? 'white' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {e.emoji} {e.label}
                      </button>
                    )} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Notes générales</Label>
                <Textarea rows={2} placeholder="Contexte, marché..." {...register('notes')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Setup</Label>
                <Textarea rows={2} placeholder="Pourquoi ce trade..." {...register('setup_notes')} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle}>Erreurs</Label>
                <Textarea rows={2} placeholder="Ce que j'aurais dû faire..." {...register('mistake_notes')} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-4">
            <Button
              type="button" variant="ghost" className="flex-1"
              onClick={onClose} style={{ color: 'var(--text-muted)' }}
            >
              Annuler
            </Button>
            <Button
              type="submit" className="flex-1"
              disabled={isSubmitting}
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {isSubmitting ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Ajouter le trade'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

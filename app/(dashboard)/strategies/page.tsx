'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Strategy } from '@/types'

const ASSET_CLASS_LABELS: Record<string, string> = {
  forex: 'Forex', stocks: 'Actions', crypto: 'Crypto',
  futures: 'Futures', options: 'Options',
}

interface FormState {
  name: string
  description: string
  asset_class: string
  entry_rules: string
  exit_rules: string
  risk_rules: string
  checklist: string[]
}

const EMPTY_FORM: FormState = {
  name: '', description: '', asset_class: '', entry_rules: '',
  exit_rules: '', risk_rules: '', checklist: [],
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Strategy | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')

  const loadStrategies = useCallback(() => {
    setLoading(true)
    fetch('/api/strategies')
      .then(r => r.json())
      .then(d => setStrategies(d.strategies ?? []))
      .catch(() => toast.error('Impossible de charger les stratégies'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStrategies() }, [loadStrategies])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setNewCheckItem('')
    setDrawerOpen(true)
  }

  function openEdit(s: Strategy) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      asset_class: s.asset_class ?? '',
      entry_rules: s.entry_rules ?? '',
      exit_rules: s.exit_rules ?? '',
      risk_rules: s.risk_rules ?? '',
      checklist: (s.checklist as { label: string }[]).map(c => c.label),
    })
    setNewCheckItem('')
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || null,
        asset_class: form.asset_class || null,
        entry_rules: form.entry_rules || null,
        exit_rules: form.exit_rules || null,
        risk_rules: form.risk_rules || null,
        checklist: form.checklist.map((label, i) => ({ id: String(i), label, checked: false })),
      }
      const url = editing ? `/api/strategies/${editing.id}` : '/api/strategies'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editing ? 'Stratégie mise à jour' : 'Stratégie créée')
        setDrawerOpen(false)
        loadStrategies()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Erreur')
      }
    } catch {
      toast.error('Impossible de sauvegarder')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette stratégie ?')) return
    try {
      const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Stratégie supprimée')
        loadStrategies()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Impossible de supprimer')
    }
  }

  function addCheckItem() {
    const label = newCheckItem.trim()
    if (!label) return
    setForm(f => ({ ...f, checklist: [...f.checklist, label] }))
    setNewCheckItem('')
  }

  function removeCheckItem(i: number) {
    setForm(f => ({ ...f, checklist: f.checklist.filter((_, idx) => idx !== i) }))
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {strategies.length} stratégie{strategies.length !== 1 ? 's' : ''}
        </span>
        <Button
          size="sm"
          onClick={openCreate}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} className="mr-1" /> New Strategy
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune stratégie</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clique sur + New Strategy pour commencer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {strategies.map(s => (
              <div
                key={s.id}
                className="rounded-lg p-4 flex flex-col gap-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {s.asset_class && (
                  <Badge style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent)', border: 'none', fontSize: 10, width: 'fit-content' }}>
                    {ASSET_CLASS_LABELS[s.asset_class] ?? s.asset_class}
                  </Badge>
                )}
                {s.description && (
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                )}
                {(s.checklist as { label: string }[]).length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(s.checklist as { label: string }[]).length} règles checklist
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[480px] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Modifier la stratégie' : 'Nouvelle stratégie'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Nom *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Breakout H4"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Asset class</Label>
              <Select value={form.asset_class || 'none'} onValueChange={v => setForm(f => ({ ...f, asset_class: v === 'none' ? '' : v }))}>
                <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <SelectValue placeholder="Tous les marchés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tous les marchés</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="stocks">Actions</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles d'entrée</Label>
              <Textarea
                value={form.entry_rules}
                onChange={e => setForm(f => ({ ...f, entry_rules: e.target.value }))}
                rows={3}
                placeholder="Ex: Attendre la cassure du niveau clé..."
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles de sortie</Label>
              <Textarea
                value={form.exit_rules}
                onChange={e => setForm(f => ({ ...f, exit_rules: e.target.value }))}
                rows={3}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles de risk</Label>
              <Textarea
                value={form.risk_rules}
                onChange={e => setForm(f => ({ ...f, risk_rules: e.target.value }))}
                rows={2}
                placeholder="Ex: Max 1% du capital par trade"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Checklist</Label>
              {form.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{item}</span>
                  <button onClick={() => removeCheckItem(i)} style={{ color: 'var(--text-muted)' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
                  placeholder="Ajouter une règle..."
                  className="text-xs"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <Button size="sm" variant="ghost" onClick={addCheckItem} style={{ color: 'var(--text-muted)' }}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {saving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)} style={{ color: 'var(--text-muted)' }}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}

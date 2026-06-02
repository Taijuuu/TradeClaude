'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NotebookEntry } from '@/types'

type NoteType = 'daily' | 'weekly' | 'plan' | 'recap' | 'custom'

const TYPE_LABELS: Record<NoteType, string> = {
  daily: 'Daily', weekly: 'Weekly', plan: 'Plan', recap: 'Recap', custom: 'Custom',
}

const TYPE_COLORS: Record<NoteType, string> = {
  daily: 'rgba(34,197,94,0.15)',
  weekly: 'rgba(99,102,241,0.15)',
  plan: 'rgba(234,179,8,0.15)',
  recap: 'rgba(239,68,68,0.15)',
  custom: 'rgba(124,58,237,0.15)',
}

const TYPE_TEXT: Record<NoteType, string> = {
  daily: '#22c55e', weekly: '#6366f1', plan: '#eab308', recap: '#ef4444', custom: 'var(--accent)',
}

const ALL_FILTERS = ['all', 'daily', 'weekly', 'plan', 'recap', 'custom'] as const

interface FormState {
  title: string
  type: NoteType
  trade_date: string
  content: string
}

const EMPTY_FORM: FormState = { title: '', type: 'custom', trade_date: '', content: '' }

export default function NotebookPage() {
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [filter, setFilter] = useState<'all' | NoteType>('all')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<NotebookEntry | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadEntries = useCallback((type?: string) => {
    setLoading(true)
    const params = type && type !== 'all' ? `?type=${type}` : ''
    fetch(`/api/notebook${params}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => toast.error('Impossible de charger les entrées'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadEntries(filter) }, [filter, loadEntries])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  function openEdit(entry: NotebookEntry) {
    setEditing(entry)
    setForm({
      title: entry.title,
      type: entry.type as NoteType,
      trade_date: entry.trade_date ?? '',
      content: entry.content,
    })
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return }
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        type: form.type,
        trade_date: form.trade_date || null,
        content: form.content,
      }
      const url = editing ? `/api/notebook/${editing.id}` : '/api/notebook'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editing ? 'Entrée mise à jour' : 'Entrée créée')
        setDrawerOpen(false)
        loadEntries(filter)
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
    if (!confirm('Supprimer cette entrée ?')) return
    try {
      const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Entrée supprimée')
        loadEntries(filter)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Impossible de supprimer')
    }
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex gap-1">
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-muted)',
              }}
            >
              {f === 'all' ? 'Tous' : TYPE_LABELS[f as NoteType]}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} className="mr-1" /> New Entry
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune entrée</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Commence à écrire ton journal de trading</p>
          </div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-lg p-4 flex items-start justify-between gap-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {entry.title}
                  </span>
                  <Badge style={{
                    background: TYPE_COLORS[entry.type as NoteType],
                    color: TYPE_TEXT[entry.type as NoteType],
                    border: 'none', fontSize: 10, whiteSpace: 'nowrap',
                  }}>
                    {TYPE_LABELS[entry.type as NoteType]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {entry.trade_date && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Trade: {entry.trade_date}
                    </span>
                  )}
                </div>
                {entry.content && (
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                    {entry.content}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(entry)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)]"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
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
              {editing ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Titre *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NoteType }))}>
                <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="recap">Recap</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Date du trade (optionnel)</Label>
              <Input
                type="date"
                value={form.trade_date}
                onChange={e => setForm(f => ({ ...f, trade_date: e.target.value }))}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Contenu</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={10}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
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
